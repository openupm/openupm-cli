import {
  ReleaseVersion,
  stringifyEditorVersion,
} from "../src/domain/editor-version";
import * as projectVersionIoModule from "../src/io/project-version-io";
import { Ok } from "ts-results-es";

/**
 * Mocks return values for calls to {@link tryLoadProjectVersion}.
 * @param editorVersion The editor-version to return. Can be specified as a
 * raw string or an {@link ReleaseVersion} object.
 */
export function mockProjectVersion(editorVersion: ReleaseVersion | string) {
  const versionString =
    typeof editorVersion === "string"
      ? editorVersion
      : stringifyEditorVersion(editorVersion);

  jest
    .spyOn(projectVersionIoModule, "tryLoadProjectVersion")
    .mockReturnValue(Ok(versionString).toAsyncResult());
}
