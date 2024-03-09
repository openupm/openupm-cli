import should from "should";
import { isPackageUrl } from "../src/types/package-url";

describe("package-url", function () {
  describe("validation", function () {
    [
      "https://github.com/yo/com.base.package-a",
      "git@github.com:yo/com.base.package-a",
      "file../yo/com.base.package-a",
    ].forEach((url) =>
      it(`"${url}" is a package-url`, function () {
        should(isPackageUrl(url)).be.true();
      })
    );

    ["", "com.base.package.a"].forEach((url) =>
      it(`"${url}" is not a package-url`, function () {
        should(isPackageUrl(url)).not.be.true();
      })
    );
  });
});
