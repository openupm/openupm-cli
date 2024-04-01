import "nock";
import { getNpmrcPath } from "../src/cmd-login";
import { runWithEnv } from "./mock-env";
import path from "path";

describe("cmd-login.ts", () => {
  describe("getNpmrcPath", () => {
    it("should be USERPROFILE if defined", () => {
      const actual = runWithEnv({ USERPROFILE: "/user/dir" }, getNpmrcPath);
      const expected = path.join(path.sep, "user", "dir", ".npmrc");
      expect(actual).toEqual(expected);
    });
    it("should be HOME if USERPROFILE is not defined", () => {
      const actual = runWithEnv({ HOME: "/user/dir" }, getNpmrcPath);
      const expected = path.join(path.sep, "user", "dir", ".npmrc");
      expect(actual).toEqual(expected);
    });
    it("should fail if HOME and USERPROFILE are not defined", () => {
      expect(() => runWithEnv({}, getNpmrcPath)).toThrow();
    });
  });
});
