import { makeDetermineEditorVersion } from "../../src/services/determine-editor-version";
import { mockService } from "./service.mock";
import { LoadProjectVersion } from "../../src/io/project-version-io";
import { makeEditorVersion } from "../../src/domain/editor-version";
import { mockProjectVersion } from "../io/project-version-io.mock";

describe("determine editor version", () => {
  const exampleProjectPath = "/home/my-project/";

  function makeDependencies() {
    const loadProjectVersion = mockService<LoadProjectVersion>();

    const determineEditorVersion =
      makeDetermineEditorVersion(loadProjectVersion);
    return { determineEditorVersion, loadProjectVersion } as const;
  }

  it("should be parsed object for valid release versions", async () => {
    const { determineEditorVersion, loadProjectVersion } = makeDependencies();
    mockProjectVersion(loadProjectVersion, "2021.3.1f1");

    const actual = await determineEditorVersion(exampleProjectPath);

    expect(actual).toEqual(makeEditorVersion(2021, 3, 1, "f", 1));
  });

  it("should be original string for non-release versions", async () => {
    const { determineEditorVersion, loadProjectVersion } = makeDependencies();
    const expected = "2022.3";
    mockProjectVersion(loadProjectVersion, expected);

    const actual = await determineEditorVersion(exampleProjectPath);

    expect(actual).toEqual(expected);
  });

  it("should be original string for non-version string", async () => {
    const { determineEditorVersion, loadProjectVersion } = makeDependencies();
    const expected = "Bad version";
    mockProjectVersion(loadProjectVersion, expected);

    const actual = await determineEditorVersion(exampleProjectPath);

    expect(actual).toEqual(expected);
  });
});
