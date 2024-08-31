import { SemanticVersion } from "../../../src/domain/semantic-version";
import { isZod } from "../../../src/utils/zod-utils";

describe("semantic-version", () => {
  describe("validate", () => {
    it.each(["1.2.3", "1.2.3-alpha"])(`should be ok for "%s"`, (input) => {
      expect(isZod(input, SemanticVersion)).toBeTruthy();
    });

    it.each(["", " ", "wow", "1", "1.2"])(
      `should not be ok for "%s"`,
      (input) => {
        expect(isZod(input, SemanticVersion)).not.toBeTruthy();
      }
    );
  });
});
