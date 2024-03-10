import { coerceRegistryUrl, isRegistryUrl } from "../src/types/registry-url";

describe("registry-url", function () {
  describe("validation", function () {
    ["http://registry.npmjs.org", "https://registry.npmjs.org"].forEach(
      (input) =>
        it(`"${input}" should be registry-url`, function () {
          expect(isRegistryUrl(input)).toBeTruthy();
        })
    );
    [
      // Missing protocol
      "registry.npmjs.org/",
      // Trailing slash
      "http://registry.npmjs.org/",
    ].forEach((input) =>
      it(`"${input}" should not be registry-url`, function () {
        expect(isRegistryUrl(input)).not.toBeTruthy();
      })
    );
  });
  describe("coerce", function () {
    it("should coerce urls without protocol", () => {
      expect(coerceRegistryUrl("test.com")).toEqual("http://test.com");
    });
    it("should remove trailing slash", () => {
      expect(coerceRegistryUrl("http://test.com/")).toEqual("http://test.com");
    });
  });
});
