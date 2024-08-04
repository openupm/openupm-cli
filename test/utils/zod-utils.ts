import { removeExplicitUndefined } from "../../src/utils/zod-utils";

describe("zod utils", () => {
  describe("remove explicit undefined", () => {
    it("should fail for undefined", () => {
      expect(() => removeExplicitUndefined(undefined)).toThrow();
    });

    it.each([null, 1, "wow", true])(
      "should not change non-object values",
      (input) => {
        const actual = removeExplicitUndefined(input);

        expect(actual).toEqual(input);
      }
    );

    it("should remove direct undefined properties", () => {
      const input = { a: undefined, b: 1 };

      const actual = removeExplicitUndefined(input);

      expect(actual).toEqual({ b: 1 });
    });

    it("should remove deep undefined properties", () => {
      const input = { x: { a: undefined, b: 1 } };

      const actual = removeExplicitUndefined(input);

      expect(actual).toEqual({ x: { b: 1 } });
    });
  });
});
