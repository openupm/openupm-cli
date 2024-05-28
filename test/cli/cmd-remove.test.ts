import { exampleRegistryUrl } from "../domain/data-registry";
import { Env, ParseEnvService } from "../../src/services/parse-env";
import { makeRemoveCmd } from "../../src/cli/cmd-remove";
import { Err, Ok } from "ts-results-es";
import { makeDomainName } from "../../src/domain/domain-name";
import {
  mockProjectManifest,
  mockProjectManifestWriteResult,
} from "../io/project-manifest-io.mock";
import { buildProjectManifest } from "../domain/data-project-manifest";
import { makePackageReference } from "../../src/domain/package-reference";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { makeMockLogger } from "./log.mock";
import { mockService } from "../services/service.mock";
import {
  LoadProjectManifest,
  WriteProjectManifest,
} from "../../src/io/project-manifest-io";
import { GenericIOError } from "../../src/io/common-errors";
import { ResultCodes } from "../../src/cli/result-codes";

const somePackage = makeDomainName("com.some.package");
const otherPackage = makeDomainName("com.other.package");
const defaultEnv = {
  cwd: "/users/some-user/projects/SomeProject",
  registry: { url: exampleRegistryUrl, auth: null },
} as Env;
const defaultManifest = buildProjectManifest((manifest) =>
  manifest.addDependency(somePackage, "1.0.0", true, true)
);

function makeDependencies() {
  const parseEnv = mockService<ParseEnvService>();
  parseEnv.mockResolvedValue(Ok(defaultEnv));

  const loadProjectManifest = mockService<LoadProjectManifest>();
  mockProjectManifest(loadProjectManifest, defaultManifest);

  const writeProjectManifest = mockService<WriteProjectManifest>();
  mockProjectManifestWriteResult(writeProjectManifest);

  const log = makeMockLogger();

  const removeCmd = makeRemoveCmd(
    parseEnv,
    loadProjectManifest,
    writeProjectManifest,
    log
  );
  return {
    removeCmd,
    parseEnv,
    loadProjectManifest,
    writeProjectManifest,
    log,
  } as const;
}

describe("cmd-remove", () => {
  it("should fail if env could not be parsed", async () => {
    const expected = new GenericIOError();
    const { removeCmd, parseEnv } = makeDependencies();
    parseEnv.mockResolvedValue(Err(expected));

    const resultCode = await removeCmd(somePackage, { _global: {} });

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should fail if manifest could not be loaded", async () => {
    const { removeCmd, loadProjectManifest } = makeDependencies();
    mockProjectManifest(loadProjectManifest, null);

    const resultCode = await removeCmd(somePackage, { _global: {} });

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should notify if manifest could not be loaded", async () => {
    const { removeCmd, loadProjectManifest, log } = makeDependencies();
    mockProjectManifest(loadProjectManifest, null);

    await removeCmd(somePackage, { _global: {} });

    expect(log.error).toHaveBeenCalledWith("manifest", expect.any(String));
  });

  it("should fail if package version was specified", async () => {
    const { removeCmd } = makeDependencies();

    const resultCode = await removeCmd(
      makePackageReference(somePackage, makeSemanticVersion("1.0.0")),
      { _global: {} }
    );

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should notify if package version was specified", async () => {
    const { removeCmd, log } = makeDependencies();

    await removeCmd(
      makePackageReference(somePackage, makeSemanticVersion("1.0.0")),
      { _global: {} }
    );

    expect(log.warn).toHaveBeenCalledWith(
      "",
      expect.stringContaining("please do not specify")
    );
  });

  it("should fail if package is not in manifest", async () => {
    const { removeCmd } = makeDependencies();

    const resultCode = await removeCmd(otherPackage, { _global: {} });

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should notify if package is not in manifest", async () => {
    const { removeCmd, log } = makeDependencies();

    await removeCmd(otherPackage, { _global: {} });

    expect(log.error).toHaveBeenCalledWith(
      "404",
      expect.stringContaining("not found")
    );
  });

  it("should notify of removed package", async () => {
    const { removeCmd, log } = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(log.notice).toHaveBeenCalledWith(
      "manifest",
      expect.stringContaining("removed")
    );
  });

  it("should be atomic for multiple packages", async () => {
    const { removeCmd, writeProjectManifest } = makeDependencies();

    // One of these packages can not be removed, so none should be removed.
    await removeCmd([somePackage, otherPackage], { _global: {} });

    expect(writeProjectManifest).not.toHaveBeenCalled();
  });

  it("should remove package from manifest", async () => {
    const { removeCmd, writeProjectManifest } = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(writeProjectManifest).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.objectContaining({
        dependencies: {
          [somePackage]: expect.anything(),
        },
      })
    );
  });

  it("should remove scope from manifest", async () => {
    const { removeCmd, writeProjectManifest } = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(writeProjectManifest).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.objectContaining({
        scopes: [somePackage],
      })
    );
  });

  it("should fail if manifest could not be saved", async () => {
    const expected = new GenericIOError();
    const { removeCmd, writeProjectManifest } = makeDependencies();
    mockProjectManifestWriteResult(writeProjectManifest, expected);

    const resultCode = await removeCmd(somePackage, { _global: {} });

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should notify if manifest could not be saved", async () => {
    const { removeCmd, log, writeProjectManifest } = makeDependencies();
    mockProjectManifestWriteResult(writeProjectManifest, new GenericIOError());

    await removeCmd(somePackage, { _global: {} });

    expect(log.error).toHaveBeenCalledWith("manifest", expect.stringContaining(""));
  });

  it("should suggest to open Unity after save", async () => {
    const { removeCmd, log } = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(log.notice).toHaveBeenCalledWith("", expect.stringContaining("open Unity"));
  });
});
