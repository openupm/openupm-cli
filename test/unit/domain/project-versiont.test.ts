import { makeEditorVersion } from "../../../src/domain/editor-version";
import { validateProjectVersion } from "../../../src/domain/project-version";

describe("project version", () => {
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
