import { describe } from "mocha";
import should from "should";
import { isPackageId } from "../src/types/package-id";

describe("package-id", function () {
  describe("validate", function () {
    ["com.my-package@1.2.3"].forEach((s) =>
      it(`"${s}" should be package-id`, () => should(isPackageId(s)).be.true())
    );

    [
      "",
      " ",
      // Missing version
      "com.my-package",
      // Incomplete version
      "com.my-package@1",
      "com.my-package@1.2",
    ].forEach((s) =>
      it(`"${s}" should not be package-id`, () =>
        should(isPackageId(s)).be.false())
    );
  });
});
