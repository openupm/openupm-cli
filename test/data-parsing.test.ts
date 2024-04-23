import {
  StringFormatError,
  tryParseJson,
  tryParseYaml,
} from "../src/utils/data-parsing";
import yaml from "yaml";

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

  // TODO: Add toml tests

  describe("yaml", () => {
    it("should round-trip valid yaml", () => {
      const expected = { test: 123 };
      const text = yaml.stringify(expected);

      const result = tryParseYaml(text);

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should fail for bad yaml", () => {
      const yaml = "{ invalid yaml ";

      const result = tryParseYaml(yaml);

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(StringFormatError)
      );
    });
  });
});
