import {
  ReleaseVersion,
  stringifyEditorVersion,
} from "../../src/domain/editor-version";
import { LoadProjectVersion } from "../../src/io/project-version-io";

/**
 * Mocks return values for calls to a {@link LoadProjectVersion} function.
 * @param loadProjectVersion The function to mock.
 * @param editorVersion The editor-version to return. Can be specified as a
 * raw string or an {@link ReleaseVersion} object.
 */
export function mockProjectVersion(
  loadProjectVersion: jest.MockedFunction<LoadProjectVersion>,
  editorVersion: ReleaseVersion | string
) {
  const versionString =
    typeof editorVersion === "string"
      ? editorVersion
      : stringifyEditorVersion(editorVersion);

  loadProjectVersion.mockResolvedValue(versionString);
}
