import { DomainName } from "../../../src/domain/domain-name";
import { CheckUrlExists } from "../../../src/io/check-url";
import { PackageHasDocPage } from "../../../src/services/unity-package-check";
import { mockService } from "./service.mock";

describe("unity package has doc page", () => {
  const somePackage = DomainName.parse("com.some.package");

  function makeDependencies() {
    const checkUrlExists = mockService<CheckUrlExists>();

    const packageHasDocPage = PackageHasDocPage(checkUrlExists);
    return { packageHasDocPage, checkUrlExists } as const;
  }

  it("should be true if manual page exists", async () => {
    const { packageHasDocPage, checkUrlExists } = makeDependencies();
    checkUrlExists.mockResolvedValue(true);

    const actual = await packageHasDocPage(somePackage);

    expect(actual).toBeTruthy();
  });

  it("should be false if manual page does not exist", async () => {
    const { packageHasDocPage, checkUrlExists } = makeDependencies();
    checkUrlExists.mockResolvedValue(false);

    const actual = await packageHasDocPage(somePackage);

    expect(actual).toBeFalsy();
  });
});
