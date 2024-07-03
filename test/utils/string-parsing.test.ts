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

      const actual = tryParseJson(json);

      expect(actual).toEqual(expected);
    });

    it("should fail for bad data", () => {
      const json = "{ invalid json ";

      expect(() => tryParseJson(json)).toThrow(StringFormatError);
    });
  });

  describe("toml", () => {
    it("should round-trip toml", () => {
      const expected = { test: 123 };
      const toml = TOML.stringify(expected);

      const actual = tryParseToml(toml);

      expect(actual).toEqual(expected);
    });

    it("should fail for bad data", () => {
      const toml = "{ invalid toml ";

      expect(() => tryParseToml(toml)).toThrow(StringFormatError);
    });
  });

  describe("yaml", () => {
    it("should round-trip valid yaml", () => {
      const expected = { test: 123 };
      const text = yaml.stringify(expected);

      const actual = tryParseYaml(text);

      expect(actual).toEqual(expected);
    });

    it("should fail for bad yaml", () => {
      const yaml = "{ invalid yaml ";

      expect(() => tryParseYaml(yaml)).toThrow(StringFormatError);
    });
  });
});
