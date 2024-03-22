import { isPackageUrl } from "../src/types/package-url";
import fc from "fast-check";
import { arbDomainName } from "./domain-name.gen";

describe("package-url", () => {
  describe("validation", () => {
    it("should be ok for http", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `http://github.com/user/${{ packumentName }}`;
          expect(isPackageUrl(input)).toBeTruthy();
        })
      );
    });

    it("should be ok for https", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `https://github.com/user/${{ packumentName }}`;
          expect(isPackageUrl(input)).toBeTruthy();
        })
      );
    });

    it("should be ok for git", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `git@github:user/${{ packumentName }}`;
          expect(isPackageUrl(input)).toBeTruthy();
        })
      );
    });

    it("should be ok for file", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `file:/path/to/${{ packumentName }}`;
          expect(isPackageUrl(input)).toBeTruthy();
        })
      );
    });

    it.each([
      // No protocol
      "my.server/my-package",
      // Bad protocol
      "ftp://my.server/my-package",
    ])(`should not be ok for "%s"`, (url) => {
      expect(isPackageUrl(url)).not.toBeTruthy();
    });
  });
});
