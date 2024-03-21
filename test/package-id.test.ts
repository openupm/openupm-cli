import { isPackageId } from "../src/types/package-id";

describe("package-id", () => {
  describe("validate", () => {
    it("should be ok for name with semantic version", () => {
      const s = "test@1.2.3";
      expect(isPackageId(s)).toBeTruthy();
    });

    it("should not be ok for just name", () => {
      const s = "test";
      expect(isPackageId(s)).toBeFalsy();
    });

    it("should not be ok for invalid name", () => {
      const s = "--test@1.2.3";
      expect(isPackageId(s)).toBeFalsy();
    });

    it("should not be ok for invalid version", () => {
      const s = "test@1.2.a";
      expect(isPackageId(s)).toBeFalsy();
    });
  });
});
