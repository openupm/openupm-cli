import { GetLatestVersionFromRegistryPackument } from "../../../src/app/get-latest-version";
import { DomainName } from "../../../src/domain/domain-name";
import { UnityPackument } from "../../../src/domain/packument";
import { Registry } from "../../../src/domain/registry";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import { GetRegistryPackument } from "../../../src/io/packument-io";
import { exampleRegistryUrl } from "../../common/data-registry";
import { mockFunctionOfType } from "./func.mock";

describe("get latest version from registry packument", () => {
  const somePackage = DomainName.parse("com.some.package");

  const exampleRegistry: Registry = { url: exampleRegistryUrl, auth: null };

  function makeDependencies() {
    const getRegistryPackument = mockFunctionOfType<GetRegistryPackument>();

    const getLatestVersionFromRegistryPackument =
      GetLatestVersionFromRegistryPackument(getRegistryPackument);
    return {
      getLatestVersionFromRegistryPackument,
      getRegistryPackument,
    } as const;
  }

  it("should get specified latest version from packument", async () => {
    const { getLatestVersionFromRegistryPackument, getRegistryPackument } =
      makeDependencies();
    const packument = {
      versions: { ["1.0.0" as SemanticVersion]: { version: "1.0.0" } },
      "dist-tags": { latest: "1.0.0" },
    } as UnityPackument;
    getRegistryPackument.mockResolvedValue(packument);

    const actual = await getLatestVersionFromRegistryPackument(
      exampleRegistry,
      somePackage
    );

    expect(actual).toEqual("1.0.0");
  });

  it("should get latest listed version from packument if no latest was specified", async () => {
    const { getLatestVersionFromRegistryPackument, getRegistryPackument } =
      makeDependencies();
    const packument = {
      versions: { ["1.0.0" as SemanticVersion]: { version: "1.0.0" } },
    } as UnityPackument;
    getRegistryPackument.mockResolvedValue(packument);

    const actual = await getLatestVersionFromRegistryPackument(
      exampleRegistry,
      somePackage
    );

    expect(actual).toEqual("1.0.0");
  });
});
