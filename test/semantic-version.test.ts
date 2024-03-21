import { isSemanticVersion } from "../src/types/semantic-version";

describe("semantic-version", () => {
  describe("validate", () => {
    it.each(["1.2.3", "1.2.3-alpha"])(`should be ok for "%s"`, (input) => {
      expect(isSemanticVersion(input)).toBeTruthy();
    });

    ["", " ", "wow", "1", "1.2"].forEach((input) =>
      it(`"${input}" is not a semantic version`, function () {
        expect(isSemanticVersion(input)).not.toBeTruthy();
      })
    );
  });
});
