import { Err, Ok } from "ts-results-es";
import { makeEditorVersion } from "../../../src/domain/editor-version";
import {
  EditorNotInstalledError,
  makeFindBuiltInPackages,
} from "../../../src/io/builtin-packages";
import { GetDirectoriesIn } from "../../../src/io/directory-io";
import * as specialPaths from "../../../src/io/special-paths";
import { OSNotSupportedError } from "../../../src/io/special-paths";
import { noopLogger } from "../../../src/logging";
import { mockFunctionOfType } from "../services/func.mock";
import { eaccesError, enoentError } from "./node-error.mock";

function makeDependencies() {
  const getDirectoriesIn = mockFunctionOfType<GetDirectoriesIn>();

  const getBuiltInPackages = makeFindBuiltInPackages(
    getDirectoriesIn,
    noopLogger
  );
  return { getBuiltInPackages, getDirectoriesIn } as const;
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
    const { getBuiltInPackages, getDirectoriesIn } = makeDependencies();
    getDirectoriesIn.mockRejectedValue(enoentError);

    const result = await getBuiltInPackages(version).promise;

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should fail if directory could not be read", async () => {
    const version = makeEditorVersion(2022, 1, 2, "f", 1);
    const { getBuiltInPackages, getDirectoriesIn } = makeDependencies();
    const expected = eaccesError;
    jest
      .spyOn(specialPaths, "tryGetEditorInstallPath")
      .mockReturnValue(Ok("/some/path"));
    getDirectoriesIn.mockRejectedValue(expected);

    await expect(getBuiltInPackages(version).promise).rejects.toEqual(expected);
  });

  it("should find package names", async () => {
    const version = makeEditorVersion(2022, 1, 2, "f", 1);
    const expected = ["com.unity.ugui", "com.unity.modules.uielements"];
    const { getBuiltInPackages, getDirectoriesIn } = makeDependencies();
    jest
      .spyOn(specialPaths, "tryGetEditorInstallPath")
      .mockReturnValue(Ok("/some/path"));
    getDirectoriesIn.mockResolvedValue(expected);

    const result = await getBuiltInPackages(version).promise;

    expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
  });
});
