import {
  dependenciesOf,
  tryGetTargetEditorVersionFor,
  UnityPackageManifest,
} from "../../src/domain/package-manifest";
import fc from "fast-check";
import { arbDomainName } from "./domain-name.arb";
import { makeEditorVersion } from "../../src/domain/editor-version";
import { InvalidTargetEditorError } from "../../src/domain/packument";
import { makeSemanticVersion } from "../../src/domain/semantic-version";

describe("package manifest", () => {
  describe("get dependency list", () => {
    it("should get all dependencies", () => {
      const packageManifest = {
        dependencies: {
          "com.some.package": "1.0.0",
          "com.other.package": "2.0.0",
        },
      };

      const dependencies = dependenciesOf(packageManifest);

      expect(dependencies).toEqual([
        ["com.some.package", "1.0.0"],
        ["com.other.package", "2.0.0"],
      ]);
    });

    it("should empty list for missing dependencies property", () => {
      const packageManifest = {
        dependencies: undefined,
      };

      const dependencies = dependenciesOf(packageManifest);

      expect(dependencies).toEqual([]);
    });
  });

  describe("determine editor-version", () => {
    it("should get version without release", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const expected = makeEditorVersion(2020, 3);
          const packageManifest: UnityPackageManifest = {
            name: packumentName,
            version: makeSemanticVersion("1.0.0"),
            unity: "2020.3",
          };

          const result = tryGetTargetEditorVersionFor(packageManifest);

          expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
        })
      );
    });

    it("should get version with release", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const expected = makeEditorVersion(2020, 3, 1);
          const packageManifest: UnityPackageManifest = {
            name: packumentName,
            version: makeSemanticVersion("1.0.0"),
            unity: "2020.3",
            unityRelease: "1",
          };

          const result = tryGetTargetEditorVersionFor(packageManifest);

          expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
        })
      );
    });

    it("should be null for missing major.minor", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const packageManifest: UnityPackageManifest = {
            name: packumentName,
            version: makeSemanticVersion("1.0.0"),
          };

          const result = tryGetTargetEditorVersionFor(packageManifest);

          expect(result).toBeOk((actual) => expect(actual).toBeNull());
        })
      );
    });

    it("should fail for bad version", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const packageManifest: UnityPackageManifest = {
            name: packumentName,
            version: makeSemanticVersion("1.0.0"),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            unity: "bad version",
          };

          const result = tryGetTargetEditorVersionFor(packageManifest);

          expect(result).toBeError((actual) =>
            expect(actual).toBeInstanceOf(InvalidTargetEditorError)
          );
        })
      );
    });
  });
});
