import { makeDepsCmd } from "../src/cli/cmd-deps";
import * as envModule from "../src/utils/env";
import { Env } from "../src/utils/env";
import { Err, Ok } from "ts-results-es";
import { exampleRegistryUrl } from "./data-registry";
import { unityRegistryUrl } from "../src/domain/registry-url";
import { makeEditorVersion } from "../src/domain/editor-version";
import { IOError } from "../src/io/file-io";
import { makeDomainName } from "../src/domain/domain-name";
import { makePackageReference } from "../src/domain/package-reference";
import { spyOnLog } from "./log.mock";
import { makeSemanticVersion } from "../src/domain/semantic-version";
import { PackumentNotFoundError } from "../src/common-errors";
import { VersionNotFoundError } from "../src/packument-resolving";
import { ResolveDependenciesService } from "../src/services/dependency-resolving";

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

function makeDependencies() {
  const resolveDependencies: jest.MockedFunction<ResolveDependenciesService> =
    jest.fn();
  resolveDependencies.mockResolvedValue([
    [
      {
        upstream: false,
        internal: false,
        self: true,
        name: somePackage,
        version: makeSemanticVersion("1.2.3"),
      },
      {
        upstream: false,
        internal: false,
        self: false,
        name: otherPackage,
        version: makeSemanticVersion("1.2.3"),
      },
    ],
    [],
  ]);

  const depsCmd = makeDepsCmd(resolveDependencies);
  return [depsCmd, resolveDependencies] as const;
}

describe("cmd-deps", () => {
  beforeEach(() => {
    jest.spyOn(envModule, "parseEnv").mockResolvedValue(Ok(defaultEnv));
  });

  it("should fail if env could not be parsed", async () => {
    const expected = new IOError();
    jest.spyOn(envModule, "parseEnv").mockResolvedValue(Err(expected));
    const [depsCmd] = makeDependencies();

    const result = await depsCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should fail if package-reference has url-version", async () => {
    const [depsCmd] = makeDependencies();

    const operation = depsCmd(
      makePackageReference(somePackage, "https://some.registry.com"),
      {
        _global: {},
      }
    );

    await expect(operation).rejects.toMatchObject({
      message: "Cannot get dependencies for url-version",
    });
  });

  it("should notify of shallow operation start", async () => {
    const verboseSpy = spyOnLog("verbose");
    const [depsCmd] = makeDependencies();

    await depsCmd(somePackage, {
      _global: {},
    });

    expect(verboseSpy).toHaveLogLike("dependency", "deep=false");
  });

  it("should notify of deep operation start", async () => {
    const verboseSpy = spyOnLog("verbose");
    const [depsCmd] = makeDependencies();

    await depsCmd(somePackage, {
      _global: {},
      deep: true,
    });

    expect(verboseSpy).toHaveLogLike("dependency", "deep=true");
  });

  it("should log valid dependencies", async () => {
    const noticeSpy = spyOnLog("notice");
    const [depsCmd] = makeDependencies();

    await depsCmd(somePackage, {
      _global: {},
    });

    expect(noticeSpy).toHaveLogLike("dependency", otherPackage);
  });

  it("should log missing dependency", async () => {
    const warnSpy = spyOnLog("warn");
    const [depsCmd, resolveDependencies] = makeDependencies();
    resolveDependencies.mockResolvedValue([
      [],
      [
        {
          name: otherPackage,
          self: false,
          reason: new PackumentNotFoundError(),
        },
      ],
    ]);

    await depsCmd(somePackage, {
      _global: {},
    });

    expect(warnSpy).toHaveLogLike("missing dependency", otherPackage);
  });

  it("should log missing dependency version", async () => {
    const warnSpy = spyOnLog("warn");
    const [depsCmd, resolveDependencies] = makeDependencies();
    resolveDependencies.mockResolvedValue([
      [],
      [
        {
          name: otherPackage,
          self: false,
          reason: new VersionNotFoundError(makeSemanticVersion("1.2.3"), []),
        },
      ],
    ]);

    await depsCmd(somePackage, {
      _global: {},
    });

    expect(warnSpy).toHaveLogLike("missing dependency version", otherPackage);
  });
});
