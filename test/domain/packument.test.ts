import {
  tryGetLatestVersion,
  tryGetPackumentVersion,
} from "../../src/domain/packument";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { buildPackument } from "./data-packument";

describe("packument", () => {
  describe("get latest version", () => {
    it("should first get version from dist-tags", async () => {
      const packument = {
        "dist-tags": { latest: makeSemanticVersion("1.0.0") },
      };

      const version = tryGetLatestVersion(packument);

      expect(version).toEqual("1.0.0");
    });

    it("should then get version from version property", async () => {
      const packument = {
        version: makeSemanticVersion("1.0.0"),
      };

      const version = tryGetLatestVersion(packument);

      expect(version).toEqual("1.0.0");
    });

    it("should be undefined if version can not be found", () => {
      const packument = {};

      const version = tryGetLatestVersion(packument);

      expect(version).toBeUndefined();
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
