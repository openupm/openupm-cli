import {
  isPackageReference,
  makePackageReference,
  splitPackageReference,
} from "../src/types/package-reference";

describe("package-reference", () => {
  describe("validation", () => {
    it.each([
      "com.abc.my-package",
      "com.abc.my-package@1.2.3",
      "com.abc.my-package@file://./my-package",
      "com.abc.my-package@latest",
    ])(`should be ok for "%s"`, (input) => {
      expect(isPackageReference(input)).toBeTruthy();
    });

    it.each([
      // Not valid domain name
      "-hello",
    ])(`"should not be ok for "%s"`, (input) => {
      expect(isPackageReference(input)).not.toBeTruthy();
    });
  });

  describe("split", () => {
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
