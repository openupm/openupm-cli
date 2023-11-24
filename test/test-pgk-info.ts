import { tryGetLatestVersion } from "../src/utils/pkg-info";
import "should";
import { describe } from "mocha";
import should from "should";
import { semanticVersion } from "../src/types/semantic-version";

describe("pkg-info", function () {
  describe("tryGetLatestVersion", function () {
    it("from dist-tags", async function () {
      const version = tryGetLatestVersion({
        "dist-tags": { latest: semanticVersion("1.0.0") },
      });
      should(version).equal("1.0.0");
    });
  });
});
