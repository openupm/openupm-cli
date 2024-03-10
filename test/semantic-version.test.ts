import { isSemanticVersion } from "../src/types/semantic-version";

describe("semantic-version", function () {
  describe("validate", function () {
    ["1.2.3", "1.2.3-alpha"].forEach((input) =>
      it(`"${input}" is a semantic version`, function () {
        expect(isSemanticVersion(input)).toBeTruthy();
      })
    );
    ["", " ", "wow", "1", "1.2"].forEach((input) =>
      it(`"${input}" is not a semantic version`, function () {
        expect(isSemanticVersion(input)).not.toBeTruthy();
      })
    );
  });
});
