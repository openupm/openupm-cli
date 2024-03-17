import {
  isPackageReference,
  makePackageReference,
  splitPackageReference,
} from "../src/types/package-reference";

describe("package-reference", function () {
  describe("validation", function () {
    [
      "com.abc.my-package",
      "com.abc.my-package@1.2.3",
      "com.abc.my-package@file://./my-package",
      "com.abc.my-package@latest",
    ].forEach((input) =>
      it(`"${input}" should be package-reference`, function () {
        expect(isPackageReference(input)).toBeTruthy();
      })
    );
    [
      // Not valid domain name
      "-hello",
    ].forEach((input) =>
      it(`"${input}" should not be package-reference`, function () {
        expect(isPackageReference(input)).not.toBeTruthy();
      })
    );
  });

  describe("split", function () {
    function shouldSplitCorrectly(name: string, version?: string) {
      const [actualName, actualVersion] = splitPackageReference(
        makePackageReference(name, version)
      );
      expect(actualName).toEqual(name);
      expect(actualVersion).toEqual(version);
    }

    it("should split package without version", () =>
      shouldSplitCorrectly("com.abc.my-package"));
    it("should split package with semantic version", () =>
      shouldSplitCorrectly("com.abc.my-package", "1.0.0"));
    it("should split package with file-url", () =>
      shouldSplitCorrectly("com.abc.my-package", "file://./my-package"));
    it("should split package with latest-tag", () =>
      shouldSplitCorrectly("com.abc.my-package", "latest"));
  });
});
