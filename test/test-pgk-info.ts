import { tryGetLatestVersion } from "../src/utils/pkg-info";
import assert from "assert";
import "should";
import { describe } from "mocha";

describe("pkg-info", function () {
  describe("tryGetLatestVersion", function () {
    it("from dist-tags", async function () {
      const version = tryGetLatestVersion({ "dist-tags": { latest: "1.0.0" } });
      assert(version !== undefined);
      version.should.equal("1.0.0");
    });
  });
});
