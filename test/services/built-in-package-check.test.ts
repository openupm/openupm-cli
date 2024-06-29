import { CheckIsUnityPackage } from "../../src/services/unity-package-check";
import { makeCheckIsBuiltInPackage } from "../../src/services/built-in-package-check";
import { mockService } from "./service.mock";
import { FetchPackument } from "../../src/io/packument-io";
import { AsyncErr, AsyncOk } from "../../src/utils/result-utils";
import { makeDomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { UnityPackument } from "../../src/domain/packument";
import { GenericNetworkError } from "../../src/io/common-errors";

describe("is built-in package", () => {
  const somePackage = makeDomainName("com.some.package");
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
    checkIsUnityPackage.mockReturnValue(AsyncOk(false));

    const result = await checkIsBuiltInPackage(somePackage, someVersion)
      .promise;

    expect(result).toBeOk((actual) => expect(actual).toBeFalsy());
  });

  it("should be false if package is Unity package and exists on Unity registry", async () => {
    const { checkIsBuiltInPackage, checkIsUnityPackage, fetchPackument } =
      makeDependencies();
    checkIsUnityPackage.mockReturnValue(AsyncOk(true));
    fetchPackument.mockReturnValue(
      AsyncOk({ versions: { [someVersion]: {} } } as UnityPackument)
    );

    const result = await checkIsBuiltInPackage(somePackage, someVersion)
      .promise;

    expect(result).toBeOk((actual) => expect(actual).toBeFalsy());
  });

  it("should be true if package is Unity package, but does not exist on Unity registry", async () => {
    const { checkIsBuiltInPackage, checkIsUnityPackage, fetchPackument } =
      makeDependencies();
    checkIsUnityPackage.mockReturnValue(AsyncOk(true));
    fetchPackument.mockReturnValue(AsyncOk(null));

    const result = await checkIsBuiltInPackage(somePackage, someVersion)
      .promise;

    expect(result).toBeOk((actual) => expect(actual).toBeTruthy());
  });

  it("should fail if Unity package check failed", async () => {
    const expected = new GenericNetworkError();
    const { checkIsBuiltInPackage, checkIsUnityPackage } = makeDependencies();
    checkIsUnityPackage.mockReturnValue(AsyncErr(expected));

    const result = await checkIsBuiltInPackage(somePackage, someVersion)
      .promise;

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should fail if Unity registry check failed", async () => {
    const expected = new GenericNetworkError();
    const { checkIsBuiltInPackage, checkIsUnityPackage, fetchPackument } =
      makeDependencies();
    checkIsUnityPackage.mockReturnValue(AsyncOk(true));
    fetchPackument.mockReturnValue(AsyncErr(expected));

    const result = await checkIsBuiltInPackage(somePackage, someVersion)
      .promise;

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });
});
