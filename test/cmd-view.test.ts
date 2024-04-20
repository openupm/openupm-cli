import { makeViewCmd } from "../src/cli/cmd-view";
import { FetchPackumentService } from "../src/services/fetch-packument";
import { Env, ParseEnvService } from "../src/services/parse-env";
import { exampleRegistryUrl } from "./data-registry";
import { unityRegistryUrl } from "../src/domain/registry-url";
import { IOError } from "../src/io/file-io";
import { Err, Ok } from "ts-results-es";
import { makeDomainName } from "../src/domain/domain-name";
import { makePackageReference } from "../src/domain/package-reference";
import { makeSemanticVersion } from "../src/domain/semantic-version";
import {
  PackageWithVersionError,
  PackumentNotFoundError,
} from "../src/common-errors";
import { spyOnLog } from "./log.mock";
import * as packumentResolveModule from "../src/packument-resolving";
import { ResolvedPackument } from "../src/packument-resolving";
import { buildPackument } from "./data-packument";

const somePackage = makeDomainName("com.some.package");
const somePackument = buildPackument(somePackage, (packument) =>
  packument
    .set("time", {
      modified: "2019-11-28T18:51:58.123Z",
      created: "2019-11-28T18:51:58.123Z",
      [makeSemanticVersion("1.0.0")]: "2019-11-28T18:51:58.123Z",
    })
    .set("_rev", "3-418f950115c32bd0")
    .set("readme", "A demo package")
    .addVersion("1.0.0", (version) =>
      version
        .set("displayName", "Package A")
        .set("author", { name: "batman" })
        .set("unity", "2018.4")
        .set("description", "A demo package")
        .set("keywords", [""])
        .set("category", "Unity")
        .set("gitHead", "5c141ecfac59c389090a07540f44c8ac5d07a729")
        .set("readmeFilename", "README.md")
        .set("_nodeVersion", "12.13.1")
        .set("_npmVersion", "6.12.1")
        .set("dist", {
          integrity:
            "sha512-MAh44bur7HGyfbCXH9WKfaUNS67aRMfO0VAbLkr+jwseb1hJue/I1pKsC7PKksuBYh4oqoo9Jov1cBcvjVgjmA==",
          shasum: "516957cac4249f95cafab0290335def7d9703db7",
          tarball:
            "https://cdn.example.com/com.example.package-a/com.example.package-a-1.0.0.tgz",
        })
    )
);
const defaultEnv = {
  upstream: false,
  registry: { url: exampleRegistryUrl, auth: null },
  upstreamRegistry: { url: unityRegistryUrl, auth: null },
} as Env;

function makeDependencies() {
  const parseEnv: jest.MockedFunction<ParseEnvService> = jest.fn();
  parseEnv.mockResolvedValue(Ok(defaultEnv));

  const fetchService: jest.MockedFunction<FetchPackumentService> = jest.fn();

  const viewCmd = makeViewCmd(parseEnv, fetchService);
  return [viewCmd, parseEnv] as const;
}

describe("cmd-view", () => {
  beforeEach(() => {
    jest.spyOn(packumentResolveModule, "tryResolve").mockReturnValue(
      Ok({
        packument: somePackument,
      } as ResolvedPackument).toAsyncResult()
    );
  });

  it("should fail if env could not be parsed", async () => {
    const expected = new IOError();
    const [viewCmd, parseEnv] = makeDependencies();
    parseEnv.mockResolvedValue(Err(expected));

    const result = await viewCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should fail if package version was specified", async () => {
    const [viewCmd] = makeDependencies();

    const result = await viewCmd(
      makePackageReference(somePackage, makeSemanticVersion("1.0.0")),
      { _global: {} }
    );

    expect(result).toBeError((actual) =>
      expect(actual).toBeInstanceOf(PackageWithVersionError)
    );
  });

  it("should notify if package version was specified", async () => {
    const warnSpy = spyOnLog("warn");
    const [viewCmd] = makeDependencies();

    await viewCmd(
      makePackageReference(somePackage, makeSemanticVersion("1.0.0")),
      { _global: {} }
    );

    expect(warnSpy).toHaveLogLike("", "please do not specify");
  });

  it("should fail if package could not be resolved", async () => {
    const expected = new PackumentNotFoundError();
    jest
      .spyOn(packumentResolveModule, "tryResolve")
      .mockReturnValue(Err(expected).toAsyncResult());
    const [viewCmd] = makeDependencies();

    const result = await viewCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should notify if package could not be resolved", async () => {
    const errorSpy = spyOnLog("error");
    jest
      .spyOn(packumentResolveModule, "tryResolve")
      .mockReturnValue(Err(new PackumentNotFoundError()).toAsyncResult());
    const [viewCmd] = makeDependencies();

    await viewCmd(somePackage, { _global: {} });

    expect(errorSpy).toHaveLogLike("404", "not found");
  });

  it("should print package information", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    const [viewCmd] = makeDependencies();

    await viewCmd(somePackage, { _global: {} });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(somePackage)
    );
  });
});
