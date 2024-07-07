import { makeDepsCmd } from "../../src/cli/cmd-deps";
import { Env, ParseEnv } from "../../src/services/parse-env";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";
import { makeDomainName } from "../../src/domain/domain-name";
import { makePackageReference } from "../../src/domain/package-reference";
import { makeMockLogger } from "./log.mock";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { PackumentNotFoundError } from "../../src/common-errors";
import { ResolveDependencies } from "../../src/services/dependency-resolving";
import { mockService } from "../services/service.mock";
import { noopLogger } from "../../src/logging";
import { ResultCodes } from "../../src/cli/result-codes";
import { ResolveLatestVersion } from "../../src/services/resolve-latest-version";
import { VersionNotFoundError } from "../../src/domain/packument";

const somePackage = makeDomainName("com.some.package");
const otherPackage = makeDomainName("com.other.package");

const defaultEnv = {
  registry: { url: exampleRegistryUrl, auth: null },
  upstreamRegistry: { url: unityRegistryUrl, auth: null },
} as Env;

function makeDependencies() {
  const parseEnv = mockService<ParseEnv>();
  parseEnv.mockResolvedValue(defaultEnv);

  const resolveDependencies = mockService<ResolveDependencies>();
  resolveDependencies.mockResolvedValue({
    [somePackage]: {
      [makeSemanticVersion("1.2.3")]: {
        resolved: true,
        source: exampleRegistryUrl,
        dependencies: { [otherPackage]: makeSemanticVersion("1.2.3") },
      },
    },
    [otherPackage]: {
      [makeSemanticVersion("1.2.3")]: {
        resolved: true,
        source: exampleRegistryUrl,
        dependencies: {},
      },
    },
  });

  const resolveLatestVersion = mockService<ResolveLatestVersion>();
  resolveLatestVersion.mockResolvedValue({
    source: exampleRegistryUrl,
    value: makeSemanticVersion("1.2.3"),
  });

  const log = makeMockLogger();

  const depsCmd = makeDepsCmd(
    parseEnv,
    resolveDependencies,
    resolveLatestVersion,
    log,
    noopLogger
  );
  return {
    depsCmd,
    parseEnv,
    resolveDependencies,
    resolveLatestVersion,
    log,
  } as const;
}

describe("cmd-deps", () => {
  it("should fail if package-reference has url-version", async () => {
    const { depsCmd } = makeDependencies();

    const resultCode = await depsCmd(
      makePackageReference(somePackage, "https://some.registry.com"),
      {
        _global: {},
      }
    );

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should fail if latest version could not be r esolved", async () => {
    const { depsCmd, resolveLatestVersion } = makeDependencies();
    resolveLatestVersion.mockResolvedValue(null);

    await expect(
      depsCmd(somePackage, {
        _global: {},
      })
    ).rejects.toBeInstanceOf(PackumentNotFoundError);
  });

  it("should notify if package-reference has url-version", async () => {
    const { depsCmd, log } = makeDependencies();

    await depsCmd(
      makePackageReference(somePackage, "https://some.registry.com"),
      {
        _global: {},
      }
    );

    expect(log.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("url-version")
    );
  });

  it("should log valid dependencies", async () => {
    const { depsCmd, log } = makeDependencies();

    await depsCmd(somePackage, {
      _global: {},
    });

    expect(log.notice).toHaveBeenCalledWith(
      "dependency",
      expect.stringContaining(otherPackage)
    );
  });

  it("should log missing dependency", async () => {
    const { depsCmd, resolveDependencies, log } = makeDependencies();
    resolveDependencies.mockResolvedValue({
      [otherPackage]: {
        [makeSemanticVersion("1.2.3")]: {
          resolved: false,
          error: new PackumentNotFoundError(otherPackage),
        },
      },
    });

    await depsCmd(somePackage, {
      _global: {},
    });

    expect(log.warn).toHaveBeenCalledWith(
      "missing dependency",
      expect.stringContaining(otherPackage)
    );
  });

  it("should log missing dependency version", async () => {
    const { depsCmd, resolveDependencies, log } = makeDependencies();
    resolveDependencies.mockResolvedValue({
      [otherPackage]: {
        [makeSemanticVersion("1.2.3")]: {
          resolved: false,
          error: new VersionNotFoundError(
            otherPackage,
            makeSemanticVersion("1.2.3"),
            []
          ),
        },
      },
    });

    await depsCmd(somePackage, {
      _global: {},
    });

    expect(log.warn).toHaveBeenCalledWith(
      "missing dependency version",
      expect.stringContaining(otherPackage)
    );
  });
});
