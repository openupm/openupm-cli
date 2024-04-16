import * as specialPaths from "../io/special-paths";
import { OSNotSupportedError } from "../io/special-paths";
import * as fileIo from "../io/file-io";
import { NotFoundError } from "../io/file-io";
import { Err, Ok } from "ts-results-es";
import {
  EditorNotInstalledError,
  tryGetBuiltinPackagesFor,
} from "./builtin-packages";
import { makeEditorVersion } from "../domain/editor-version";

describe("builtin-packages", () => {
  describe("get", () => {
    it("should fail if editor-path could not be determined", async () => {
      const expected = new OSNotSupportedError("haiku");
      jest
        .spyOn(specialPaths, "tryGetEditorInstallPath")
        .mockReturnValue(Err(expected));
      const version = makeEditorVersion(2022, 1, 2, "f", 1);

      const result = await tryGetBuiltinPackagesFor(version).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if editor is not installed", async () => {
      const version = makeEditorVersion(2022, 1, 2, "f", 1);
      const expected = new EditorNotInstalledError(version);
      jest
        .spyOn(fileIo, "tryGetDirectoriesIn")
        .mockReturnValue(Err(new NotFoundError("")).toAsyncResult());

      const result = await tryGetBuiltinPackagesFor(version).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should find package names", async () => {
      const version = makeEditorVersion(2022, 1, 2, "f", 1);
      const expected = ["com.unity.ugui", "com.unity.modules.uielements"];
      jest
        .spyOn(specialPaths, "tryGetEditorInstallPath")
        .mockReturnValue(Ok("/some/path"));
      jest
        .spyOn(fileIo, "tryGetDirectoriesIn")
        .mockReturnValue(Ok(expected).toAsyncResult());

      const result = await tryGetBuiltinPackagesFor(version).promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });
  });
});
