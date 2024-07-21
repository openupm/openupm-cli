import { makeDepsCmd } from "../../src/cli/cmd-deps";
import { Env, ParseEnv } from "../../src/services/parse-env";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";
import { DomainName } from "../../src/domain/domain-name";
import { makePackageReference } from "../../src/domain/package-reference";
import { makeMockLogger } from "./log.mock";
import { SemanticVersion } from "../../src/domain/semantic-version";
import { PackumentNotFoundError } from "../../src/common-errors";
import { ResolveDependencies } from "../../src/services/dependency-resolving";
import { mockService } from "../services/service.mock";
import { noopLogger } from "../../src/logging";
import { ResultCodes } from "../../src/cli/result-codes";
import { ResolveLatestVersion } from "../../src/services/resolve-latest-version";
import {
  makeGraphFromSeed,
  markBuiltInResolved,
  markRemoteResolved,
} from "../../src/domain/dependency-graph";

const somePackage = DomainName.parse("com.some.package");
const otherPackage = DomainName.parse("com.other.package");
const anotherPackage = DomainName.parse("com.another.package");

const defaultEnv = {
  registry: { url: exampleRegistryUrl, auth: null },
  upstreamRegistry: { url: unityRegistryUrl, auth: null },
} as Env;

const someVersion = SemanticVersion.parse("1.2.3");

function makeDependencies() {
  const parseEnv = mockService<ParseEnv>();
  parseEnv.mockResolvedValue(defaultEnv);

  const resolveDependencies = mockService<ResolveDependencies>();
  let defaultGraph = makeGraphFromSeed(somePackage, someVersion);
  defaultGraph = markRemoteResolved(
    defaultGraph,
    somePackage,
    someVersion,
    exampleRegistryUrl,
    { [otherPackage]: someVersion }
  );
  defaultGraph = markRemoteResolved(
    defaultGraph,
    otherPackage,
    someVersion,
    exampleRegistryUrl,
    {}
  );
  resolveDependencies.mockResolvedValue(defaultGraph);

  const resolveLatestVersion = mockService<ResolveLatestVersion>();
  resolveLatestVersion.mockResolvedValue({
    source: exampleRegistryUrl,
    value: someVersion,
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

  it("should print dependency graph", async () => {
    const { depsCmd, resolveDependencies, log } = makeDependencies();
    let graph = makeGraphFromSeed(somePackage, someVersion);
    graph = markRemoteResolved(
      graph,
      somePackage,
      someVersion,
      exampleRegistryUrl,
      {
        [otherPackage]: someVersion,
        [anotherPackage]: someVersion,
      }
    );
    graph = markBuiltInResolved(graph, otherPackage, someVersion);
    graph = markBuiltInResolved(graph, anotherPackage, someVersion);
    resolveDependencies.mockResolvedValue(graph);

    await depsCmd(somePackage, {
      _global: {},
    });

    // Here we just do some generic checks to see if something containing
    // all relevant information was logged. For more detailed testing
    // of the output format see the tests for the dependency graph
    // logging logic.
    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining(somePackage)
    );
    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining(otherPackage)
    );
    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining(anotherPackage)
    );
  });
});
