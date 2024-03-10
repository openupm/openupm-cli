import { tryGetLatestVersion } from "../src/types/packument";

import { semanticVersion } from "../src/types/semantic-version";

describe("packument", function () {
  describe("tryGetLatestVersion", function () {
    it("from dist-tags", async function () {
      const version = tryGetLatestVersion({
        "dist-tags": { latest: semanticVersion("1.0.0") },
      });
      expect(version).toEqual("1.0.0");
    });
  });
});
