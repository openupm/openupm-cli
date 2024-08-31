import {
  isPackageReference,
  makePackageReference,
  splitPackageReference,
} from "../../../src/domain/package-reference";
import fc from "fast-check";
import { arbDomainName } from "./domain-name.arb";

describe("package-reference", () => {
  describe("validation", () => {
    it("should be ok for just name", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          expect(isPackageReference(packumentName)).toBeTruthy();
        })
      );
    });

    it("should be ok for name with semantic version", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `${packumentName}@1.2.3`;
          expect(isPackageReference(input)).toBeTruthy();
        })
      );
    });

    it("should be ok for name with file version", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `${packumentName}@file:/path/to/${packumentName}`;
          expect(isPackageReference(input)).toBeTruthy();
        })
      );
    });

    it("should be ok for name with http version", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `${packumentName}@http://my.server/${packumentName}`;
          expect(isPackageReference(input)).toBeTruthy();
        })
      );
    });

    it("should be ok for name with git version", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `${packumentName}@git@github:user/${packumentName}`;
          expect(isPackageReference(input)).toBeTruthy();
        })
      );
    });

    it("should be ok for name with latest tag", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `${packumentName}@latest`;
          expect(isPackageReference(input)).toBeTruthy();
        })
      );
    });

    it.each([
      // Not valid domain name
      "-hello",
      // Bad semantic version
      "my.package@1.abc",
      // Bad url version
      "my.package@what://is.this",
      // Bad tag
      "my.package@ltst",
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
