import {
  determineUseColor,
  determineUseUpstream,
} from "../../../src/cli/parse-env";

describe("parse env", () => {
  describe("color", () => {
    it("should use color if color option is true", () => {
      const actual = determineUseColor(
        {},
        {
          color: true,
        }
      );

      expect(actual).toBeTruthy();
    });

    it("should use color if color option is missing", () => {
      const actual = determineUseColor({}, {});

      expect(actual).toBeTruthy();
    });

    it("should not use color if color option is false", () => {
      const actual = determineUseColor(
        {},
        {
          color: false,
        }
      );

      expect(actual).toBeFalsy();
    });
  });

  describe("use upstream", () => {
    it("should use upstream if upstream option is true", () => {
      const actual = determineUseUpstream({
        upstream: true,
      });

      expect(actual).toBeTruthy();
    });

    it("should use upstream if upstream option is missing", () => {
      const actual = determineUseUpstream({});

      expect(actual).toBeTruthy();
    });

    it("should not use upstream if upstream option is false", () => {
      const actual = determineUseUpstream({
        upstream: false,
      });

      expect(actual).toBeFalsy();
    });
  });
});
