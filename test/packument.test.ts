import {
  targetEditorVersionFor,
  tryGetLatestVersion,
  UnityPackumentVersion,
} from "../src/types/packument";
import { makeSemanticVersion } from "../src/types/semantic-version";
import fc from "fast-check";
import { arbDomainName } from "./domain-name.arb";

describe("packument", () => {
  describe("tryGetLatestVersion", () => {
    it("should get version from dist-tags", async function () {
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
          const expected = "2020.3";
          const packumentVersion: UnityPackumentVersion = {
            name: packumentName,
            version: makeSemanticVersion("1.0.0"),
            unity: expected,
          };

          const actual = targetEditorVersionFor(packumentVersion);

          expect(actual).toEqual(expected);
        })
      );
    });

    it("should get version with release", () => {
      fc.assert(
        fc.property(arbDomainName, (packumentName) => {
          const packumentVersion: UnityPackumentVersion = {
            name: packumentName,
            version: makeSemanticVersion("1.0.0"),
            unity: "2020.3",
            unityRelease: "1",
          };

          const actual = targetEditorVersionFor(packumentVersion);

          expect(actual).toEqual("2020.3.1");
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

          const actual = targetEditorVersionFor(packumentVersion);

          expect(actual).toBeNull();
        })
      );
    });
  });
});
