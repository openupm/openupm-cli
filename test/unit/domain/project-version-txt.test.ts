import { makeEditorVersion } from "../../../src/domain/editor-version.js";
import {
  tryParseProjectVersionTxt,
  validateProjectVersion,
} from "../../../src/domain/project-version-txt.js";

describe("ProjectVersion.txt", () => {
  describe("parsing", () => {
    it("should fail for bad yaml", () => {
      const content = "this:: is (not ]] valid / yaml";

      expect(() => tryParseProjectVersionTxt(content)).toThrow();
    });

    it("should fail for bad shape", () => {
      const content = "good yaml: but not what we want";

      expect(() => tryParseProjectVersionTxt(content)).toThrow();
    });

    it("should extract editor version", () => {
      const expected = "2022.2.3f1";
      const content = `m_EditorVersion: ${expected}`;

      const actual = tryParseProjectVersionTxt(content);

      expect(actual).toEqual(expected);
    });
  });

  describe("validate", () => {
    it("should be parsed object for valid release versions", () => {
      const actual = validateProjectVersion("2021.3.1f1");

      expect(actual).toEqual(makeEditorVersion(2021, 3, 1, "f", 1));
    });

    it("should be original string for non-release versions", () => {
      const expected = "2022.3";

      const actual = validateProjectVersion(expected);

      expect(actual).toEqual(expected);
    });

    it("should be original string for non-version string", () => {
      const expected = "Bad version";

      const actual = validateProjectVersion(expected);

      expect(actual).toEqual(expected);
    });
  });
});
