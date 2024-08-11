import { CheckIsUnityPackage } from "../../src/services/unity-package-check";
import { makeCheckIsBuiltInPackage } from "../../src/services/built-in-package-check";
import { mockService } from "./service.mock";
import { GetRegistryPackument } from "../../src/io/packument-io";
import { DomainName } from "../../src/domain/domain-name";
import { SemanticVersion } from "../../src/domain/semantic-version";
import { UnityPackument } from "../../src/domain/packument";

describe("is built-in package", () => {
  const somePackage = DomainName.parse("com.some.package");
  const someVersion = SemanticVersion.parse("1.0.0");

  function makeDependencies() {
    const checkIsUnityPackage = mockService<CheckIsUnityPackage>();

    const getRegistryPackument = mockService<GetRegistryPackument>();

    const checkIsBuiltInPackage = makeCheckIsBuiltInPackage(
      checkIsUnityPackage,
      getRegistryPackument
    );
    return { checkIsBuiltInPackage, checkIsUnityPackage, getRegistryPackument };
  }

  it("should be false if package is not a Unity package", async () => {
    const { checkIsBuiltInPackage, checkIsUnityPackage } = makeDependencies();
    checkIsUnityPackage.mockResolvedValue(false);

    const actual = await checkIsBuiltInPackage(somePackage, someVersion);

    expect(actual).toBeFalsy();
  });

  it("should be false if package is Unity package and exists on Unity registry", async () => {
    const { checkIsBuiltInPackage, checkIsUnityPackage, getRegistryPackument } =
      makeDependencies();
    checkIsUnityPackage.mockResolvedValue(true);
    getRegistryPackument.mockResolvedValue({
      versions: { [someVersion]: {} },
    } as UnityPackument);

    const actual = await checkIsBuiltInPackage(somePackage, someVersion);

    expect(actual).toBeFalsy();
  });

  it("should be true if package is Unity package, but does not exist on Unity registry", async () => {
    const { checkIsBuiltInPackage, checkIsUnityPackage, getRegistryPackument } =
      makeDependencies();
    checkIsUnityPackage.mockResolvedValue(true);
    getRegistryPackument.mockResolvedValue(null);

    const actual = await checkIsBuiltInPackage(somePackage, someVersion);

    expect(actual).toBeTruthy();
  });
});
