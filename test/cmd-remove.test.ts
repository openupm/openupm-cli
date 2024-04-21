import { exampleRegistryUrl } from "./data-registry";
import { Env, ParseEnvService } from "../src/services/parse-env";
import { makeRemoveCmd } from "../src/cli/cmd-remove";
import { Err, Ok } from "ts-results-es";
import { IOError, NotFoundError } from "../src/io/file-io";
import { makeDomainName } from "../src/domain/domain-name";
import {
  mockProjectManifest,
  spyOnSavedManifest,
} from "./project-manifest-io.mock";
import { buildProjectManifest } from "./data-project-manifest";
import { makePackageReference } from "../src/domain/package-reference";
import { makeSemanticVersion } from "../src/domain/semantic-version";
import {
  PackageWithVersionError,
  PackumentNotFoundError,
} from "../src/common-errors";
import { spyOnLog } from "./log.mock";
import { mockService } from "./service.mock";
import { LoadProjectManifest } from "../src/io/project-manifest-io";

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

  const removeCmd = makeRemoveCmd(parseEnv, loadProjectManifest);
  return { removeCmd, parseEnv, loadProjectManifest } as const;
}

describe("cmd-remove", () => {
  beforeEach(() => {
    spyOnSavedManifest();
  });

  it("should fail if env could not be parsed", async () => {
    const expected = new IOError();
    const { removeCmd, parseEnv } = makeDependencies();
    parseEnv.mockResolvedValue(Err(expected));

    const result = await removeCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should fail if manifest could not be loaded", async () => {
    const { removeCmd, loadProjectManifest } = makeDependencies();
    mockProjectManifest(loadProjectManifest, null);

    const result = await removeCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) =>
      expect(actual).toBeInstanceOf(NotFoundError)
    );
  });

  it("should notify if manifest could not be loaded", async () => {
    const errorSpy = spyOnLog("error");
    const { removeCmd, loadProjectManifest } = makeDependencies();
    mockProjectManifest(loadProjectManifest, null);

    await removeCmd(somePackage, { _global: {} });

    expect(errorSpy).toHaveLogLike("manifest", "");
  });

  it("should fail if package version was specified", async () => {
    const { removeCmd } = makeDependencies();

    const result = await removeCmd(
      makePackageReference(somePackage, makeSemanticVersion("1.0.0")),
      { _global: {} }
    );

    expect(result).toBeError((actual) =>
      expect(actual).toBeInstanceOf(PackageWithVersionError)
    );
  });

  it("should notify if package version was specified", async () => {
    const warnSpy = spyOnLog("warn");
    const { removeCmd } = makeDependencies();

    await removeCmd(
      makePackageReference(somePackage, makeSemanticVersion("1.0.0")),
      { _global: {} }
    );

    expect(warnSpy).toHaveLogLike("", "please do not specify");
  });

  it("should fail if package is not in manifest", async () => {
    const { removeCmd } = makeDependencies();

    const result = await removeCmd(otherPackage, { _global: {} });

    expect(result).toBeError((actual) =>
      expect(actual).toBeInstanceOf(PackumentNotFoundError)
    );
  });

  it("should notify if package is not in manifest", async () => {
    const errorSpy = spyOnLog("error");
    const { removeCmd } = makeDependencies();

    await removeCmd(otherPackage, { _global: {} });

    expect(errorSpy).toHaveLogLike("404", "not found");
  });

  it("should notify of removed package", async () => {
    const noticeSpy = spyOnLog("notice");
    const { removeCmd } = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(noticeSpy).toHaveLogLike("manifest", "removed");
  });

  it("should be atomic for multiple packages", async () => {
    const saveSpy = spyOnSavedManifest();
    const { removeCmd } = makeDependencies();

    // One of these packages can not be removed, so none should be removed.
    await removeCmd([somePackage, otherPackage], { _global: {} });

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("should remove package from manifest", async () => {
    const saveSpy = spyOnSavedManifest();
    const { removeCmd } = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(saveSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.objectContaining({
        dependencies: {
          [somePackage]: expect.anything(),
        },
      })
    );
  });

  it("should remove scope from manifest", async () => {
    const saveSpy = spyOnSavedManifest();
    const { removeCmd } = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(saveSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.objectContaining({
        scopes: [somePackage],
      })
    );
  });

  it("should fail if manifest could not be saved", async () => {
    const expected = new IOError();
    spyOnSavedManifest().mockReturnValue(Err(expected).toAsyncResult());
    const { removeCmd } = makeDependencies();

    const result = await removeCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should notify if manifest could not be saved", async () => {
    const errorSpy = spyOnLog("error");
    spyOnSavedManifest().mockReturnValue(Err(new IOError()).toAsyncResult());
    const { removeCmd } = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(errorSpy).toHaveLogLike("manifest", "");
  });

  it("should suggest to open Unity after save", async () => {
    const noticeSpy = spyOnLog("notice");
    const { removeCmd } = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(noticeSpy).toHaveLogLike("", "open Unity");
  });
});
