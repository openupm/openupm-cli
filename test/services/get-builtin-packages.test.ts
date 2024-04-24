import * as specialPaths from "../../src/io/special-paths";
import { OSNotSupportedError } from "../../src/io/special-paths";
import * as fileIo from "../../src/io/file-io";
import { NotFoundError } from "../../src/io/file-io";
import { Err, Ok } from "ts-results-es";
import {
  EditorNotInstalledError,
  makeGetBuiltInPackagesService,
} from "../../src/services/get-builtin-packages";
import { makeEditorVersion } from "../../src/domain/editor-version";

function makeDependencies() {
  const getBuiltInPackages = makeGetBuiltInPackagesService();
  return { getBuiltInPackages } as const;
}

describe("builtin-packages", () => {
  it("should fail if editor-path could not be determined", async () => {
    const expected = new OSNotSupportedError("haiku");
    jest
      .spyOn(specialPaths, "tryGetEditorInstallPath")
      .mockReturnValue(Err(expected));
    const version = makeEditorVersion(2022, 1, 2, "f", 1);
    const { getBuiltInPackages } = makeDependencies();

    const result = await getBuiltInPackages(version).promise;

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should fail if editor is not installed", async () => {
    const version = makeEditorVersion(2022, 1, 2, "f", 1);
    const expected = new EditorNotInstalledError(version);
    const { getBuiltInPackages } = makeDependencies();
    jest
      .spyOn(fileIo, "tryGetDirectoriesIn")
      .mockReturnValue(Err(new NotFoundError("")).toAsyncResult());

    const result = await getBuiltInPackages(version).promise;

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should find package names", async () => {
    const version = makeEditorVersion(2022, 1, 2, "f", 1);
    const expected = ["com.unity.ugui", "com.unity.modules.uielements"];
    const { getBuiltInPackages } = makeDependencies();
    jest
      .spyOn(specialPaths, "tryGetEditorInstallPath")
      .mockReturnValue(Ok("/some/path"));
    jest
      .spyOn(fileIo, "tryGetDirectoriesIn")
      .mockReturnValue(Ok(expected).toAsyncResult());

    const result = await getBuiltInPackages(version).promise;

    expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
  });
});
