import {
  tryGetLatestVersion,
  tryGetPackumentVersion,
} from "../../src/domain/packument";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
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
