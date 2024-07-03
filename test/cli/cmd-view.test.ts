import { makeViewCmd } from "../../src/cli/cmd-view";
import { Env, ParseEnv } from "../../src/services/parse-env";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";
import { makeDomainName } from "../../src/domain/domain-name";
import { makePackageReference } from "../../src/domain/package-reference";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { makeMockLogger } from "./log.mock";
import { buildPackument } from "../domain/data-packument";
import { mockService } from "../services/service.mock";
import { GenericNetworkError } from "../../src/io/common-errors";
import { ResultCodes } from "../../src/cli/result-codes";
import { FetchPackument } from "../../src/io/packument-io";

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
  const parseEnv = mockService<ParseEnv>();
  parseEnv.mockResolvedValue(defaultEnv);

  const fetchPackument = mockService<FetchPackument>();
  fetchPackument.mockResolvedValue(somePackument);

  const log = makeMockLogger();

  const viewCmd = makeViewCmd(parseEnv, fetchPackument, log);
  return {
    viewCmd,
    parseEnv,
    fetchPackument: fetchPackument,
    log,
  } as const;
}

describe("cmd-view", () => {
  it("should fail if package version was specified", async () => {
    const { viewCmd } = makeDependencies();

    const resultCode = await viewCmd(
      makePackageReference(somePackage, makeSemanticVersion("1.0.0")),
      { _global: {} }
    );

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should notify if package version was specified", async () => {
    const { viewCmd, log } = makeDependencies();

    await viewCmd(
      makePackageReference(somePackage, makeSemanticVersion("1.0.0")),
      { _global: {} }
    );

    expect(log.warn).toHaveBeenCalledWith(
      "",
      expect.stringContaining("please do not specify")
    );
  });

  it("should fail if package was not found", async () => {
    const { viewCmd, fetchPackument } = makeDependencies();
    fetchPackument.mockResolvedValue(null);

    const resultCode = await viewCmd(somePackage, { _global: {} });

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should fail if package could not be resolved", async () => {
    const expected = new GenericNetworkError();
    const { viewCmd, fetchPackument } = makeDependencies();
    fetchPackument.mockRejectedValue(expected);

    const resultCode = await viewCmd(somePackage, { _global: {} });

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should notify if package could not be resolved", async () => {
    const { viewCmd, fetchPackument, log } = makeDependencies();
    fetchPackument.mockResolvedValue(null);

    await viewCmd(somePackage, { _global: {} });

    expect(log.error).toHaveBeenCalledWith(
      "404",
      expect.stringContaining("not found")
    );
  });

  it("should print package information", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    const { viewCmd } = makeDependencies();

    await viewCmd(somePackage, { _global: {} });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(somePackage)
    );
  });
});
