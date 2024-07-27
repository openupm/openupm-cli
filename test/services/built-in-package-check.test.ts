import { CheckIsUnityPackage } from "../../src/services/unity-package-check";
import { makeCheckIsBuiltInPackage } from "../../src/services/built-in-package-check";
import { mockService } from "./service.mock";
import { FetchPackument } from "../../src/io/packument-io";
import { DomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { UnityPackument } from "../../src/domain/packument";

describe("is built-in package", () => {
  const somePackage = DomainName.parse("com.some.package");
  const someVersion = makeSemanticVersion("1.0.0");

  function makeDependencies() {
    const checkIsUnityPackage = mockService<CheckIsUnityPackage>();

    const fetchPackument = mockService<FetchPackument>();

    const checkIsBuiltInPackage = makeCheckIsBuiltInPackage(
      checkIsUnityPackage,
      fetchPackument
    );
    return { checkIsBuiltInPackage, checkIsUnityPackage, fetchPackument };
  }

  it("should be false if package is not a Unity package", async () => {
    const { checkIsBuiltInPackage, checkIsUnityPackage } = makeDependencies();
    checkIsUnityPackage.mockResolvedValue(false);

    const actual = await checkIsBuiltInPackage(somePackage, someVersion);

    expect(actual).toBeFalsy();
  });

  it("should be false if package is Unity package and exists on Unity registry", async () => {
    const { checkIsBuiltInPackage, checkIsUnityPackage, fetchPackument } =
      makeDependencies();
    checkIsUnityPackage.mockResolvedValue(true);
    fetchPackument.mockResolvedValue({
      versions: { [someVersion]: {} },
    } as UnityPackument);

    const actual = await checkIsBuiltInPackage(somePackage, someVersion);

    expect(actual).toBeFalsy();
  });

  it("should be true if package is Unity package, but does not exist on Unity registry", async () => {
    const { checkIsBuiltInPackage, checkIsUnityPackage, fetchPackument } =
      makeDependencies();
    checkIsUnityPackage.mockResolvedValue(true);
    fetchPackument.mockResolvedValue(null);

    const actual = await checkIsBuiltInPackage(somePackage, someVersion);

    expect(actual).toBeTruthy();
  });
});
