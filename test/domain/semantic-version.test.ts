import { isSemanticVersion } from "../../src/domain/semantic-version";

describe("semantic-version", () => {
  describe("validate", () => {
    it.each(["1.2.3", "1.2.3-alpha"])(`should be ok for "%s"`, (input) => {
      expect(isSemanticVersion(input)).toBeTruthy();
    });

    it.each(["", " ", "wow", "1", "1.2"])(
      `should not be ok for "%s"`,
      (input) => {
        expect(isSemanticVersion(input)).not.toBeTruthy();
      }
    );
  });
});
