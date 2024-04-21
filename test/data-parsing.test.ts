import { StringFormatError, tryParseJson } from "../src/utils/data-parsing";

describe("data-parsing", () => {
  describe("json", () => {
    it("should round-trip valid json", () => {
      const expected = { test: 123 };
      const json = JSON.stringify(expected);

      const result = tryParseJson(json);

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should notify of parse error", () => {
      const json = "{ invalid json ";

      const result = tryParseJson(json);

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(StringFormatError)
      );
    });
  });
});
