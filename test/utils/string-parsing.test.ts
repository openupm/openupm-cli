import {
  StringFormatError,
  tryParseJson,
  tryParseToml,
  tryParseYaml,
} from "../../src/utils/string-parsing";
import yaml from "yaml";
import TOML from "@iarna/toml";

describe("string-parsing", () => {
  describe("json", () => {
    it("should round-trip valid json", () => {
      const expected = { test: 123 };
      const json = JSON.stringify(expected);

      const result = tryParseJson(json);

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should fail for bad data", () => {
      const json = "{ invalid json ";

      const result = tryParseJson(json);

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(StringFormatError)
      );
    });
  });

  describe("toml", () => {
    it("should round-trip toml", () => {
      const expected = { test: 123 };
      const toml = TOML.stringify(expected);

      const result = tryParseToml(toml);

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should fail for bad data", () => {
      const toml = "{ invalid toml ";

      const result = tryParseToml(toml);

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(StringFormatError)
      );
    });
  });

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
