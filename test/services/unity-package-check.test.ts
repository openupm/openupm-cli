import { makeCheckIsUnityPackage } from "../../src/services/unity-package-check";
import { mockService } from "./service.mock";
import { CheckUrlExists } from "../../src/io/check-url";
import { AsyncErr, AsyncOk } from "../../src/utils/result-utils";
import { makeDomainName } from "../../src/domain/domain-name";
import { GenericNetworkError } from "../../src/io/common-errors";

describe("is unity package", () => {
  const somePackage = makeDomainName("com.some.package");

  function makeDependencies() {
    const checkUrlExists = mockService<CheckUrlExists>();

    const checkIsUnityPackage = makeCheckIsUnityPackage(checkUrlExists);
    return { checkIsUnityPackage, checkUrlExists } as const;
  }

  it("should be true if manual page exists", async () => {
    const { checkIsUnityPackage, checkUrlExists } = makeDependencies();
    checkUrlExists.mockReturnValue(AsyncOk(true));

    const result = await checkIsUnityPackage(somePackage).promise;

    expect(result).toBeOk((actual) => expect(actual).toBeTruthy());
  });

  it("should be false if manual page does not exist", async () => {
    const { checkIsUnityPackage, checkUrlExists } = makeDependencies();
    checkUrlExists.mockReturnValue(AsyncOk(false));

    const result = await checkIsUnityPackage(somePackage).promise;

    expect(result).toBeOk((actual) => expect(actual).toBeFalsy());
  });

  it("should fail if page status could not be verified", async () => {
    const expected = new GenericNetworkError();
    const { checkIsUnityPackage, checkUrlExists } = makeDependencies();
    checkUrlExists.mockReturnValue(AsyncErr(expected));

    const result = await checkIsUnityPackage(somePackage).promise;

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });
});
