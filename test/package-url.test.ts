import { isPackageUrl } from "../src/types/package-url";

describe("package-url", () => {
  describe("validation", () => {
    it.each([
      "https://github.com/yo/com.base.package-a",
      "git@github.com:yo/com.base.package-a",
      "file../yo/com.base.package-a",
    ])(`should be ok for "%s"`, (url) => {
      expect(isPackageUrl(url)).toBeTruthy();
    });

    ["", "com.base.package.a"].forEach((url) =>
      it(`"${url}" is not a package-url`, function () {
        expect(isPackageUrl(url)).not.toBeTruthy();
      })
    );
  });
});
