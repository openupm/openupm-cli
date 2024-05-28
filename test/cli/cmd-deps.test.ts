import { makeDepsCmd } from "../../src/cli/cmd-deps";
import { Env, ParseEnvService } from "../../src/services/parse-env";
import { Err, Ok } from "ts-results-es";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";
import { makeDomainName } from "../../src/domain/domain-name";
import { makePackageReference } from "../../src/domain/package-reference";
import { makeMockLogger } from "./log.mock";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { PackumentNotFoundError } from "../../src/common-errors";
import { ResolveDependenciesService } from "../../src/services/dependency-resolving";
import { mockService } from "../services/service.mock";
import { VersionNotFoundError } from "../../src/domain/packument";
import { noopLogger } from "../../src/logging";
import { GenericIOError } from "../../src/io/common-errors";
import { ResultCodes } from "../../src/cli/result-codes";

const somePackage = makeDomainName("com.some.package");
const otherPackage = makeDomainName("com.other.package");

const defaultEnv = {
  registry: { url: exampleRegistryUrl, auth: null },
  upstreamRegistry: { url: unityRegistryUrl, auth: null },
} as Env;

function makeDependencies() {
  const parseEnv = mockService<ParseEnvService>();
  parseEnv.mockResolvedValue(Ok(defaultEnv));

  const resolveDependencies = mockService<ResolveDependenciesService>();
  resolveDependencies.mockResolvedValue(
    Ok([
      [
        {
          source: exampleRegistryUrl,
          self: true,
          name: somePackage,
          version: makeSemanticVersion("1.2.3"),
        },
        {
          source: exampleRegistryUrl,
          self: false,
          name: otherPackage,
          version: makeSemanticVersion("1.2.3"),
        },
      ],
      [],
    ])
  );

  const log = makeMockLogger();

  const depsCmd = makeDepsCmd(parseEnv, resolveDependencies, log, noopLogger);
  return { depsCmd, parseEnv, resolveDependencies, log } as const;
}

describe("cmd-deps", () => {
  it("should fail if env could not be parsed", async () => {
    const expected = new GenericIOError();
    const { depsCmd, parseEnv } = makeDependencies();
    parseEnv.mockResolvedValue(Err(expected));

    const resultCode = await depsCmd(somePackage, { _global: {} });

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should fail if package-reference has url-version", async () => {
    const { depsCmd } = makeDependencies();

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

  it("should log valid dependencies", async () => {
    const { depsCmd, log } = makeDependencies();

    await depsCmd(somePackage, {
      _global: {},
    });

    expect(log.notice).toHaveLogLike(
      "dependency",
      expect.stringContaining(otherPackage)
    );
  });

  it("should log missing dependency", async () => {
    const { depsCmd, resolveDependencies, log } = makeDependencies();
    resolveDependencies.mockResolvedValue(
      Ok([
        [],
        [
          {
            name: otherPackage,
            self: false,
            reason: new PackumentNotFoundError(),
          },
        ],
      ])
    );

    await depsCmd(somePackage, {
      _global: {},
    });

    expect(log.warn).toHaveLogLike(
      "missing dependency",
      expect.stringContaining(otherPackage)
    );
  });

  it("should log missing dependency version", async () => {
    const { depsCmd, resolveDependencies, log } = makeDependencies();
    resolveDependencies.mockResolvedValue(
      Ok([
        [],
        [
          {
            name: otherPackage,
            self: false,
            reason: new VersionNotFoundError(makeSemanticVersion("1.2.3"), []),
          },
        ],
      ])
    );

    await depsCmd(somePackage, {
      _global: {},
    });

    expect(log.warn).toHaveLogLike(
      "missing dependency version",
      expect.stringContaining(otherPackage)
    );
  });
});
