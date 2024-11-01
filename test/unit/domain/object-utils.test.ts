import { omitKey } from "../../../src/domain/object-utils.js";

describe("object utils", () => {
  describe("omit key", () => {
    it("should omit key", () => {
      const original = { a: 1, b: 2 };

      const actual = omitKey(original, "a");

      expect(actual).toEqual({ b: 2 });
    });

    it("should not modify original", () => {
      const original = { a: 1, b: 2 };

      omitKey(original, "a");

      expect(original).toEqual({ a: 1, b: 2 });
    });
  });
});
