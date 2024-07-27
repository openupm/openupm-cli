import { makeCheckIsUnityPackage } from "../../src/services/unity-package-check";
import { mockService } from "./service.mock";
import { CheckUrlExists } from "../../src/io/check-url";
import { DomainName } from "../../src/domain/domain-name";

describe("is unity package", () => {
  const somePackage = DomainName.parse("com.some.package");

  function makeDependencies() {
    const checkUrlExists = mockService<CheckUrlExists>();

    const checkIsUnityPackage = makeCheckIsUnityPackage(checkUrlExists);
    return { checkIsUnityPackage, checkUrlExists } as const;
  }

  it("should be true if manual page exists", async () => {
    const { checkIsUnityPackage, checkUrlExists } = makeDependencies();
    checkUrlExists.mockResolvedValue(true);

    const actual = await checkIsUnityPackage(somePackage);

    expect(actual).toBeTruthy();
  });

  it("should be false if manual page does not exist", async () => {
    const { checkIsUnityPackage, checkUrlExists } = makeDependencies();
    checkUrlExists.mockResolvedValue(false);

    const actual = await checkIsUnityPackage(somePackage);

    expect(actual).toBeFalsy();
  });
});
