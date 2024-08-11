import { makeViewCmd } from "../../src/cli/cmd-view";
import { Env, ParseEnv } from "../../src/services/parse-env";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";
import { DomainName } from "../../src/domain/domain-name";
import { makePackageReference } from "../../src/domain/package-reference";
import { SemanticVersion } from "../../src/domain/semantic-version";
import { makeMockLogger } from "./log.mock";
import { buildPackument } from "../domain/data-packument";
import { mockService } from "../services/service.mock";
import { ResultCodes } from "../../src/cli/result-codes";
import { FetchPackument } from "../../src/io/packument-io";
import { PackumentNotFoundError } from "../../src/common-errors";

const somePackage = DomainName.parse("com.some.package");
const somePackument = buildPackument(somePackage, (packument) =>
  packument
    .set("time", {
      modified: "2019-11-28T18:51:58.123Z",
      created: "2019-11-28T18:51:58.123Z",
      [SemanticVersion.parse("1.0.0")]: "2019-11-28T18:51:58.123Z",
    })
    .addVersion("1.0.0", (version) =>
      version
        .set("displayName", "Package A")
        .set("author", { name: "batman" })
        .set("unity", "2018.4")
        .set("description", "A demo package")
        .set("keywords", [""])
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
      makePackageReference(somePackage, SemanticVersion.parse("1.0.0")),
      {}
    );

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should fail if package is not found", async () => {
    const { viewCmd, fetchPackument } = makeDependencies();
    fetchPackument.mockResolvedValue(null);

    await expect(viewCmd(somePackage, {})).rejects.toBeInstanceOf(
      PackumentNotFoundError
    );
  });

  it("should notify if package version was specified", async () => {
    const { viewCmd, log } = makeDependencies();

    await viewCmd(
      makePackageReference(somePackage, SemanticVersion.parse("1.0.0")),
      {}
    );

    expect(log.warn).toHaveBeenCalledWith(
      "",
      expect.stringContaining("please do not specify")
    );
  });

  it("should print package information", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    const { viewCmd } = makeDependencies();

    await viewCmd(somePackage, {});

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(somePackage)
    );
  });
});
