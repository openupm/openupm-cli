import { isPackageId } from "../src/domain/package-id";
import fc from "fast-check";
import { arbDomainName } from "./domain-name.arb";

describe("package-id", () => {
  describe("validate", () => {
    it("should be ok for name with semantic version", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `${packumentName}@1.2.3`;
          expect(isPackageId(input)).toBeTruthy();
        })
      );
    });

    it("should not be ok for just name", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) =>
          expect(isPackageId(packumentName)).toBeFalsy()
        )
      );
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
