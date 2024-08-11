import {
  ReleaseVersion,
  stringifyEditorVersion,
} from "../../src/domain/editor-version";
import { GetProjectVersion } from "../../src/io/project-version-io";

/**
 * Mocks return values for calls to a {@link GetProjectVersion} function.
 * @param getProjectVersion The function to mock.
 * @param editorVersion The editor-version to return. Can be specified as a
 * raw string or an {@link ReleaseVersion} object.
 */
export function mockProjectVersion(
  getProjectVersion: jest.MockedFunction<GetProjectVersion>,
  editorVersion: ReleaseVersion | string
) {
  const versionString =
    typeof editorVersion === "string"
      ? editorVersion
      : stringifyEditorVersion(editorVersion);

  getProjectVersion.mockResolvedValue(versionString);
}
