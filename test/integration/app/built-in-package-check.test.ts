import { DomainName } from "../../../src/domain/domain-name";
import { UnityPackument } from "../../../src/domain/packument";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import { CheckUrlExists } from "../../../src/io/check-url";
import { GetRegistryPackument } from "../../../src/io/packument-io";
import { checkIsBuiltInPackageUsing } from "../../../src/app/built-in-package-check";
import { partialApply } from "../../../src/utils/fp-utils";
import { mockFunctionOfType } from "./func.mock";

describe("is non-registry unity package", () => {
  const somePackage = DomainName.parse("com.some.package");
  const someVersion = SemanticVersion.parse("1.0.0");

  function makeDependencies() {
    const checkUrlExists = mockFunctionOfType<CheckUrlExists>();

    const getRegistryPackument = mockFunctionOfType<GetRegistryPackument>();

    const checkIsBuiltInPackage = partialApply(
      checkIsBuiltInPackageUsing,
      checkUrlExists,
      getRegistryPackument
    );
    return {
      checkIsBuiltInPackage,
      checkUrlExists,
      getRegistryPackument,
    };
  }

  it("should be false if package is not a Unity package", async () => {
    const { checkIsBuiltInPackage, checkUrlExists } = makeDependencies();
    checkUrlExists.mockResolvedValue(false);

    const actual = await checkIsBuiltInPackage(somePackage, someVersion);

    expect(actual).toBeFalsy();
  });

  it("should be false if package is Unity package and exists on Unity registry", async () => {
    const { checkIsBuiltInPackage, checkUrlExists, getRegistryPackument } =
      makeDependencies();
    checkUrlExists.mockResolvedValue(true);
    getRegistryPackument.mockResolvedValue({
      versions: { [someVersion]: {} },
    } as UnityPackument);

    const actual = await checkIsBuiltInPackage(somePackage, someVersion);

    expect(actual).toBeFalsy();
  });

  it("should be true if package is Unity package, but does not exist on Unity registry", async () => {
    const { checkIsBuiltInPackage, checkUrlExists, getRegistryPackument } =
      makeDependencies();
    checkUrlExists.mockResolvedValue(true);
    getRegistryPackument.mockResolvedValue(null);

    const actual = await checkIsBuiltInPackage(somePackage, someVersion);

    expect(actual).toBeTruthy();
  });
});
