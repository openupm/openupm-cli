import { exampleRegistryUrl } from "./data-registry";
import * as envModule from "../src/utils/env";
import { Env } from "../src/utils/env";
import { makeRemoveCmd } from "../src/cli/cmd-remove";
import { unityRegistryUrl } from "../src/domain/registry-url";
import { makeEditorVersion } from "../src/domain/editor-version";
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

const somePackage = makeDomainName("com.some.package");
const otherPackage = makeDomainName("com.other.package");
const defaultEnv: Env = {
  cwd: "/users/some-user/projects/SomeProject",
  systemUser: false,
  wsl: false,
  upstream: false,
  registry: { url: exampleRegistryUrl, auth: null },
  upstreamRegistry: { url: unityRegistryUrl, auth: null },
  editorVersion: makeEditorVersion(2022, 2, 1, "f", 2),
};
const defaultManifest = buildProjectManifest((manifest) =>
  manifest.addDependency(somePackage, "1.0.0", true, true)
);

function makeDependencies() {
  const removeCmd = makeRemoveCmd();
  return [removeCmd] as const;
}

describe("cmd-remove", () => {
  beforeEach(() => {
    jest.spyOn(envModule, "parseEnv").mockResolvedValue(Ok(defaultEnv));
    mockProjectManifest(defaultManifest);
    spyOnSavedManifest();
  });

  it("should fail if env could not be parsed", async () => {
    const expected = new IOError();
    jest.spyOn(envModule, "parseEnv").mockResolvedValue(Err(expected));
    const [removeCmd] = makeDependencies();

    const result = await removeCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should fail if manifest could not be loaded", async () => {
    mockProjectManifest(null);
    const [removeCmd] = makeDependencies();

    const result = await removeCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) =>
      expect(actual).toBeInstanceOf(NotFoundError)
    );
  });

  it("should notify if manifest could not be loaded", async () => {
    const errorSpy = spyOnLog("error");
    mockProjectManifest(null);
    const [removeCmd] = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(errorSpy).toHaveLogLike("manifest", "");
  });

  it("should fail if package version was specified", async () => {
    const [removeCmd] = makeDependencies();

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
    const [removeCmd] = makeDependencies();

    await removeCmd(
      makePackageReference(somePackage, makeSemanticVersion("1.0.0")),
      { _global: {} }
    );

    expect(warnSpy).toHaveLogLike("", "please do not specify");
  });

  it("should fail if package is not in manifest", async () => {
    const [removeCmd] = makeDependencies();

    const result = await removeCmd(otherPackage, { _global: {} });

    expect(result).toBeError((actual) =>
      expect(actual).toBeInstanceOf(PackumentNotFoundError)
    );
  });

  it("should notify if package is not in manifest", async () => {
    const errorSpy = spyOnLog("error");
    const [removeCmd] = makeDependencies();

    await removeCmd(otherPackage, { _global: {} });

    expect(errorSpy).toHaveLogLike("404", "not found");
  });

  it("should notify of removed package", async () => {
    const noticeSpy = spyOnLog("notice");
    const [removeCmd] = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(noticeSpy).toHaveLogLike("manifest", "removed");
  });

  it("should be atomic for multiple packages", async () => {
    const saveSpy = spyOnSavedManifest();
    const [removeCmd] = makeDependencies();

    // One of these packages can not be removed, so none should be removed.
    await removeCmd([somePackage, otherPackage], { _global: {} });

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("should remove package from manifest", async () => {
    const saveSpy = spyOnSavedManifest();
    const [removeCmd] = makeDependencies();

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
    const [removeCmd] = makeDependencies();

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
    const [removeCmd] = makeDependencies();

    const result = await removeCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should notify if manifest could not be saved", async () => {
    const errorSpy = spyOnLog("error");
    spyOnSavedManifest().mockReturnValue(Err(new IOError()).toAsyncResult());
    const [removeCmd] = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(errorSpy).toHaveLogLike("manifest", "");
  });

  it("should suggest to open Unity after save", async () => {
    const noticeSpy = spyOnLog("notice");
    const [removeCmd] = makeDependencies();

    await removeCmd(somePackage, { _global: {} });

    expect(noticeSpy).toHaveLogLike("", "open Unity");
  });
});
