import { makeViewCmd } from "../../src/cli/cmd-view";
import { ResultCodes } from "../../src/cli/result-codes";
import { PackumentNotFoundError } from "../../src/common-errors";
import { DomainName } from "../../src/domain/domain-name";
import { makePackageReference } from "../../src/domain/package-reference";
import { SemanticVersion } from "../../src/domain/semantic-version";
import { GetRegistryPackument } from "../../src/io/packument-io";
import { GetRegistryAuth } from "../../src/services/get-registry-auth";
import { Env, ParseEnv } from "../../src/services/parse-env";
import { buildPackument } from "../domain/data-packument";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockService } from "../services/service.mock";
import { makeMockLogger } from "./log.mock";

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
  primaryRegistryUrl: exampleRegistryUrl,
} as Env;

function makeDependencies() {
  const parseEnv = mockService<ParseEnv>();
  parseEnv.mockResolvedValue(defaultEnv);

  const getRegistryPackument = mockService<GetRegistryPackument>();
  getRegistryPackument.mockResolvedValue(somePackument);

  const getRegistryAuth = mockService<GetRegistryAuth>();
  getRegistryAuth.mockResolvedValue({
    url: defaultEnv.primaryRegistryUrl,
    auth: null,
  });

  const log = makeMockLogger();

  const viewCmd = makeViewCmd(
    parseEnv,
    getRegistryPackument,
    getRegistryAuth,
    log
  );
  return {
    viewCmd,
    parseEnv,
    getRegistryPackument: getRegistryPackument,
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
    const { viewCmd, getRegistryPackument } = makeDependencies();
    getRegistryPackument.mockResolvedValue(null);

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
