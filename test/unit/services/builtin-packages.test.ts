import { Err, Ok } from "ts-results-es";
import { makeEditorVersion } from "../../../src/domain/editor-version";
import { GetDirectoriesIn } from "../../../src/io/directory-io";
import * as specialPaths from "../../../src/io/special-paths";
import { OSNotSupportedError } from "../../../src/io/special-paths";
import { noopLogger } from "../../../src/logging";
import {
  EditorNotInstalledError,
  findBuiltInPackagesUsing,
} from "../../../src/services/builtin-packages";
import { partialApply } from "../../../src/utils/fp-utils";
import { eaccesError, enoentError } from "../io/node-error.mock";
import { mockFunctionOfType } from "../services/func.mock";

function makeDependencies() {
  const getDirectoriesIn = mockFunctionOfType<GetDirectoriesIn>();

  const findBuiltInPackages = partialApply(
    findBuiltInPackagesUsing,
    getDirectoriesIn,
    noopLogger
  );
  return { findBuiltInPackages, getDirectoriesIn } as const;
}

describe("builtin-packages", () => {
  it("should fail if editor-path could not be determined", async () => {
    const expected = new OSNotSupportedError("haiku");
    jest
      .spyOn(specialPaths, "tryGetEditorInstallPath")
      .mockReturnValue(Err(expected));
    const version = makeEditorVersion(2022, 1, 2, "f", 1);
    const { findBuiltInPackages } = makeDependencies();

    const result = await findBuiltInPackages(version).promise;

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should fail if editor is not installed", async () => {
    const version = makeEditorVersion(2022, 1, 2, "f", 1);
    const expected = new EditorNotInstalledError(version);
    const { findBuiltInPackages, getDirectoriesIn } = makeDependencies();
    getDirectoriesIn.mockRejectedValue(enoentError);

    const result = await findBuiltInPackages(version).promise;

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should fail if directory could not be read", async () => {
    const version = makeEditorVersion(2022, 1, 2, "f", 1);
    const { findBuiltInPackages, getDirectoriesIn } = makeDependencies();
    const expected = eaccesError;
    jest
      .spyOn(specialPaths, "tryGetEditorInstallPath")
      .mockReturnValue(Ok("/some/path"));
    getDirectoriesIn.mockRejectedValue(expected);

    await expect(findBuiltInPackages(version).promise).rejects.toEqual(
      expected
    );
  });

  it("should find package names", async () => {
    const version = makeEditorVersion(2022, 1, 2, "f", 1);
    const expected = ["com.unity.ugui", "com.unity.modules.uielements"];
    const { findBuiltInPackages, getDirectoriesIn } = makeDependencies();
    jest
      .spyOn(specialPaths, "tryGetEditorInstallPath")
      .mockReturnValue(Ok("/some/path"));
    getDirectoriesIn.mockResolvedValue(expected);

    const result = await findBuiltInPackages(version).promise;

    expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
  });
});
