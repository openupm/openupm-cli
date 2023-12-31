import { describe } from "mocha";
import { coerceRegistryUrl, isRegistryUrl } from "../src/types/registry-url";
import should from "should";

describe("registry-url", function () {
  describe("validation", function () {
    ["http://registry.npmjs.org", "https://registry.npmjs.org"].forEach(
      (input) =>
        it(`"${input}" should be registry-url`, function () {
          should(isRegistryUrl(input)).be.ok();
        })
    );
    [
      // Missing protocol
      "registry.npmjs.org/",
      // Trailing slash
      "http://registry.npmjs.org/",
    ].forEach((input) =>
      it(`"${input}" should not be registry-url`, function () {
        should(isRegistryUrl(input)).not.be.ok();
      })
    );
  });
  describe("coerce", function () {
    it("should coerce urls without protocol", () =>
      should(coerceRegistryUrl("test.com")).be.equal("http://test.com"));
    it("should remove trailing slash", () =>
      should(coerceRegistryUrl("http://test.com/")).be.equal(
        "http://test.com"
      ));
  });
});
