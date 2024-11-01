import fc from "fast-check";
import {
  isPackageSpec,
  makePackageSpec,
  splitPackageSpec,
} from "../../../src/domain/package-spec";
import { arbDomainName } from "./domain-name.arb";
import { arbPackageUrl } from "./package-url.arb";
import { arbSemanticVersion } from "./semantic-version.arb";

describe("package-spec", () => {
  describe("validation", () => {
    it("should be ok for just name", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          expect(isPackageSpec(packumentName)).toBeTruthy();
        })
      );
    });

    it("should be ok for name with semantic version", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `${packumentName}@1.2.3`;
          expect(isPackageSpec(input)).toBeTruthy();
        })
      );
    });

    it("should be ok for name with file version", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `${packumentName}@file:/path/to/${packumentName}`;
          expect(isPackageSpec(input)).toBeTruthy();
        })
      );
    });

    it("should be ok for name with http version", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `${packumentName}@http://my.server/${packumentName}`;
          expect(isPackageSpec(input)).toBeTruthy();
        })
      );
    });

    it("should be ok for name with git version", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `${packumentName}@git@github:user/${packumentName}`;
          expect(isPackageSpec(input)).toBeTruthy();
        })
      );
    });

    it("should be ok for name with latest tag", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const input = `${packumentName}@latest`;
          expect(isPackageSpec(input)).toBeTruthy();
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
      expect(isPackageSpec(input)).not.toBeTruthy();
    });
  });

  describe("split", () => {
    function shouldSplitCorrectly(name: string, version?: string) {
      const [actualName, actualVersion] = splitPackageSpec(
        makePackageSpec(name, version ?? null)
      );
      expect(actualName).toEqual(name);
      expect(actualVersion).toEqual(version ?? null);
    }

    it("should split package without version", () =>
      fc.assert(
        fc.property(arbDomainName, (packageName) =>
          shouldSplitCorrectly(packageName)
        )
      ));

    it("should split package with semantic version", () =>
      fc.assert(
        fc.property(arbDomainName, arbSemanticVersion, (packageName, version) =>
          shouldSplitCorrectly(packageName, version)
        )
      ));

    it("should split package with package-url", () =>
      fc.assert(
        fc.property(arbDomainName, arbPackageUrl, (packageName, version) =>
          shouldSplitCorrectly(packageName, version)
        )
      ));

    it("should split package with latest-tag", () =>
      shouldSplitCorrectly("com.abc.my-package", "latest"));
  });
});
