import { isPackageId } from "../src/types/package-id";

describe("package-id", () => {
  describe("validate", () => {
    it("should be ok for valid string", () => {
      const s = "com.my-package@1.2.3";
      expect(isPackageId(s)).toBeTruthy();
    });

    [
      "",
      " ",
      // Missing version
      "com.my-package",
      // Incomplete version
      "com.my-package@1",
      "com.my-package@1.2",
    ].forEach((s) =>
      it(`"${s}" should not be package-id`, () => {
        expect(isPackageId(s)).toBeFalsy();
      })
    );
  });
});
