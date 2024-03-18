import { tryGetLatestVersion } from "../src/types/packument";

import { makeSemanticVersion } from "../src/types/semantic-version";

describe("packument", () => {
  describe("tryGetLatestVersion", () => {
    it("from dist-tags", async function () {
      const version = tryGetLatestVersion({
        "dist-tags": { latest: makeSemanticVersion("1.0.0") },
      });
      expect(version).toEqual("1.0.0");
    });
  });
});
