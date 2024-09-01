import path from "path";
import { getHomeNpmrcPath } from "../../../src/io/npmrc-io";

describe("npmrc-io", () => {
  describe("find path in home", () => {
    const someHomePath = path.join(path.sep, "user", "dir");

    it("should be [Home]/.npmrc", () => {
      const expected = path.join(someHomePath, ".npmrc");

      const actual = getHomeNpmrcPath(someHomePath);

      expect(actual).toEqual(expected);
    });
  });
});
