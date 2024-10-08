import os from "os";
import path from "path";
import { Ok } from "ts-results-es";
import { EditorVersionNotSupportedError } from "../../../src/domain/common-errors";
import { makeEditorVersion } from "../../../src/domain/editor-version";
import {
  getHomePathFromEnv,
  NoHomePathError,
  OSNotSupportedError,
  tryGetEditorInstallPath,
  VersionNotSupportedOnOsError,
} from "../../../src/domain/special-paths";

describe("special-paths", () => {
  describe("home from env", () => {
    it("should be USERPROFILE if defined", () => {
      const expected = path.join(path.sep, "user", "dir");

      const actual = getHomePathFromEnv({ USERPROFILE: expected });

      expect(actual).toEqual(expected);
    });

    it("should be HOME if USERPROFILE is not defined", () => {
      const expected = path.join(path.sep, "user", "dir");

      const actual = getHomePathFromEnv({ HOME: expected });

      expect(actual).toEqual(expected);
    });

    it("should fail if HOME and USERPROFILE are not defined", () => {
      expect(() => getHomePathFromEnv({})).toThrow(NoHomePathError);
    });
  });

  describe("install directory", () => {
    it("should be in program files on windows", () => {
      jest.spyOn(os, "platform").mockReturnValue("win32");
      const version = makeEditorVersion(2022, 3, 22, "f", 1);
      const expected = "C:\\Program Files\\Unity\\Hub\\Editor\\2022.3.22f1";

      const result = tryGetEditorInstallPath(version);

      expect(result).toEqual(Ok(expected));
    });

    it("should be in user dir on linux for versions >= 2019.2", () => {
      jest.spyOn(os, "platform").mockReturnValue("linux");
      const version = makeEditorVersion(2022, 3, 22, "f", 1);
      const expected = "~/Unity/Hub/Editor/2022.3.22f1";

      const result = tryGetEditorInstallPath(version);

      expect(result).toEqual(Ok(expected));
    });

    it("should be fail on linux for versions < 2019.2", () => {
      jest.spyOn(os, "platform").mockReturnValue("linux");
      const version = makeEditorVersion(2018, 3, 1, "f", 1);
      const expected = new VersionNotSupportedOnOsError(version, "linux");

      const result = tryGetEditorInstallPath(version);

      const error = result.unwrapErr();
      expect(error).toEqual(expected);
    });

    it("should be in applications on mac", () => {
      jest.spyOn(os, "platform").mockReturnValue("darwin");
      const version = makeEditorVersion(2019, 1, 3, "f", 1);
      const expected = "/Applications/Unity/Hub/Editor/2019.1.3f1";

      const result = tryGetEditorInstallPath(version);

      expect(result).toEqual(Ok(expected));
    });

    it("should fail for versions < 2018.1", () => {
      jest.spyOn(os, "platform").mockReturnValue("linux");
      const version = makeEditorVersion(2017, 4, 3, "f", 1);
      const expected = new EditorVersionNotSupportedError(version);

      const result = tryGetEditorInstallPath(version);

      const error = result.unwrapErr();
      expect(error).toEqual(expected);
    });

    it("should fail for unsupported os", () => {
      jest.spyOn(os, "platform").mockReturnValue("haiku");
      const version = makeEditorVersion(2022, 2, 3, "f", 1);
      const expected = new OSNotSupportedError("haiku");

      const result = tryGetEditorInstallPath(version);

      const error = result.unwrapErr();
      expect(error).toEqual(expected);
    });
  });
});
