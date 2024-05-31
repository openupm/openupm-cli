import path from "path";
import { tryGetEnv } from "../../src/utils/env-util";
import {
  makeGetHomePath,
  OSNotSupportedError,
  tryGetEditorInstallPath,
  VersionNotSupportedOnOsError,
} from "../../src/io/special-paths";
import os from "os";
import { makeEditorVersion } from "../../src/domain/editor-version";
import { EditorVersionNotSupportedError } from "../../src/common-errors";

jest.mock("../../src/utils/env-util");

describe("special-paths", () => {
  describe("home", () => {
    function makeDependencies() {
      const getHomePath = makeGetHomePath();

      return { getHomePath } as const;
    }

    it("should be USERPROFILE if defined", () => {
      const { getHomePath } = makeDependencies();
      const expected = path.join(path.sep, "user", "dir");
      jest
        .mocked(tryGetEnv)
        .mockImplementation((key) => (key === "USERPROFILE" ? expected : null));

      const result = getHomePath();

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should be HOME if USERPROFILE is not defined", () => {
      const { getHomePath } = makeDependencies();
      const expected = path.join(path.sep, "user", "dir");
      jest
        .mocked(tryGetEnv)
        .mockImplementation((key) => (key === "HOME" ? expected : null));

      const result = getHomePath();

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if HOME and USERPROFILE are not defined", () => {
      const { getHomePath } = makeDependencies();
      jest.mocked(tryGetEnv).mockReturnValue(null);

      const result = getHomePath();

      expect(result).toBeError();
    });
  });

  describe("install directory", () => {
    it("should be in program files on windows", () => {
      jest.spyOn(os, "platform").mockReturnValue("win32");
      const version = makeEditorVersion(2022, 3, 22, "f", 1);
      const expected = "C:\\Program Files\\Unity\\Hub\\Editor\\2022.3.22f1";

      const result = tryGetEditorInstallPath(version);

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should be in user dir on linux for versions >= 2019.2", () => {
      jest.spyOn(os, "platform").mockReturnValue("linux");
      const version = makeEditorVersion(2022, 3, 22, "f", 1);
      const expected = "~/Unity/Hub/Editor/2022.3.22f1";

      const result = tryGetEditorInstallPath(version);

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should be fail on linux for versions < 2019.2", () => {
      jest.spyOn(os, "platform").mockReturnValue("linux");
      const version = makeEditorVersion(2018, 3, 1, "f", 1);
      const expected = new VersionNotSupportedOnOsError(version, "linux");

      const result = tryGetEditorInstallPath(version);

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should be in applications on mac", () => {
      jest.spyOn(os, "platform").mockReturnValue("darwin");
      const version = makeEditorVersion(2019, 1, 3, "f", 1);
      const expected = "/Applications/Unity/Hub/Editor/2019.1.3f1";

      const result = tryGetEditorInstallPath(version);

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should fail for versions < 2018.1", () => {
      jest.spyOn(os, "platform").mockReturnValue("linux");
      const version = makeEditorVersion(2017, 4, 3, "f", 1);
      const expected = new EditorVersionNotSupportedError(version);

      const result = tryGetEditorInstallPath(version);

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should fail for unsupported os", () => {
      jest.spyOn(os, "platform").mockReturnValue("haiku");
      const version = makeEditorVersion(2022, 2, 3, "f", 1);
      const expected = new OSNotSupportedError("haiku");

      const result = tryGetEditorInstallPath(version);

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });
  });
});
