import { mockService } from "./service.mock";
import { GetProjectVersion } from "../../../src/io/project-version-io";
import { makeEditorVersion } from "../../../src/domain/editor-version";
import { mockProjectVersion } from "../io/project-version-io.mock";
import { DetermineEditorVersionFromFile } from "../../../src/services/determine-editor-version";

describe("determine editor version from file", () => {
  const exampleProjectPath = "/home/my-project/";

  function makeDependencies() {
    const getProjectVersion = mockService<GetProjectVersion>();

    const determineEditorVersionFromFile =
      DetermineEditorVersionFromFile(getProjectVersion);
    return { determineEditorVersionFromFile, getProjectVersion } as const;
  }

  it("should be parsed object for valid release versions", async () => {
    const { determineEditorVersionFromFile, getProjectVersion } =
      makeDependencies();
    mockProjectVersion(getProjectVersion, "2021.3.1f1");

    const actual = await determineEditorVersionFromFile(exampleProjectPath);

    expect(actual).toEqual(makeEditorVersion(2021, 3, 1, "f", 1));
  });

  it("should be original string for non-release versions", async () => {
    const { determineEditorVersionFromFile, getProjectVersion } =
      makeDependencies();
    const expected = "2022.3";
    mockProjectVersion(getProjectVersion, expected);

    const actual = await determineEditorVersionFromFile(exampleProjectPath);

    expect(actual).toEqual(expected);
  });

  it("should be original string for non-version string", async () => {
    const { determineEditorVersionFromFile, getProjectVersion } =
      makeDependencies();
    const expected = "Bad version";
    mockProjectVersion(getProjectVersion, expected);

    const actual = await determineEditorVersionFromFile(exampleProjectPath);

    expect(actual).toEqual(expected);
  });
});
