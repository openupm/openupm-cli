import {
  InvalidTargetEditorError,
  tryGetLatestVersion,
  tryGetPackumentVersion,
  tryGetTargetEditorVersionFor,
  UnityPackumentVersion,
} from "../../src/domain/packument";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import fc from "fast-check";
import { arbDomainName } from "./domain-name.arb";
import { makeEditorVersion } from "../../src/domain/editor-version";
import { buildPackument } from "./data-packument";

describe("packument", () => {
  describe("tryGetLatestVersion", () => {
    it("should get version from dist-tags", async () => {
      const version = tryGetLatestVersion({
        "dist-tags": { latest: makeSemanticVersion("1.0.0") },
      });
      expect(version).toEqual("1.0.0");
    });
  });

  describe("determine editor-version", () => {
    it("should get version without release", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const expected = makeEditorVersion(2020, 3);
          const packumentVersion: UnityPackumentVersion = {
            name: packumentName,
            version: makeSemanticVersion("1.0.0"),
            unity: "2020.3",
          };

          const result = tryGetTargetEditorVersionFor(packumentVersion);

          expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
        })
      );
    });

    it("should get version with release", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const expected = makeEditorVersion(2020, 3, 1);
          const packumentVersion: UnityPackumentVersion = {
            name: packumentName,
            version: makeSemanticVersion("1.0.0"),
            unity: "2020.3",
            unityRelease: "1",
          };

          const result = tryGetTargetEditorVersionFor(packumentVersion);

          expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
        })
      );
    });

    it("should be null for missing major.minor", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const packumentVersion: UnityPackumentVersion = {
            name: packumentName,
            version: makeSemanticVersion("1.0.0"),
          };

          const result = tryGetTargetEditorVersionFor(packumentVersion);

          expect(result).toBeOk((actual) => expect(actual).toBeNull());
        })
      );
    });

    it("should fail for bad version", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const packumentVersion: UnityPackumentVersion = {
            name: packumentName,
            version: makeSemanticVersion("1.0.0"),
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            unity: "bad version",
          };

          const result = tryGetTargetEditorVersionFor(packumentVersion);

          expect(result).toBeError((actual) =>
            expect(actual).toBeInstanceOf(InvalidTargetEditorError)
          );
        })
      );
    });
  });

  describe("get version", () => {
    it("should find existing packument version", () => {
      const version = makeSemanticVersion("1.0.0");
      const packument = buildPackument("com.some.package", (packument) =>
        packument.addVersion(version)
      );

      const packumentVersion = tryGetPackumentVersion(packument, version);

      expect(packumentVersion).not.toBeNull();
    });

    it("should not find missing packument version", () => {
      const version = makeSemanticVersion("1.0.0");
      const packument = buildPackument("com.some.package");

      const packumentVersion = tryGetPackumentVersion(packument, version);

      expect(packumentVersion).toBeNull();
    });
  });
});
