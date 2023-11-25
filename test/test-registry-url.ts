import { describe } from "mocha";
import {
  coerceRegistryUrl,
  isRegistryUrl,
  registryUrl,
  removeTrailingSlash,
} from "../src/types/registry-url";
import should from "should";

describe("registry-url", function () {
  describe("validation", function () {
    ["http://registry.npmjs.org/", "https://registry.npmjs.org/"].forEach(
      (input) =>
        it(`"${input}" should be registry-url`, function () {
          should(isRegistryUrl(input)).be.ok();
        })
    );
    [
      // Missing protocol
      "registry.npmjs.org/",
    ].forEach((input) =>
      it(`"${input}" should not be registry-url`, function () {
        should(isRegistryUrl(input)).not.be.ok();
      })
    );
  });
  describe("remove trailing slash", function () {
    it("should remove trailing slash if it is exists", () =>
      should(removeTrailingSlash(registryUrl("http://test.com/"))).be.equal(
        "http://test.com"
      ));
    it("should do nothing if there is no trailing slash", () =>
      should(removeTrailingSlash(registryUrl("http://test.com"))).be.equal(
        "http://test.com"
      ));
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
