import {
  LoadProjectManifest,
  makeProjectManifestMissingError,
  manifestPathFor,
} from "../../src/io/project-manifest-io";
import { UnityProjectManifest } from "../../src/domain/project-manifest";
import { Err } from "ts-results-es";
import { AsyncOk } from "../../src/utils/result-utils";

/**
 * Mocks results for a {@link LoadProjectManifest} function.
 * @param loadProjectManifest The load function.
 * @param manifest The manifest that should be returned. Null if there should
 * be no manifest.
 */
export function mockProjectManifest(
  loadProjectManifest: jest.MockedFunction<LoadProjectManifest>,
  manifest: UnityProjectManifest | null
) {
  return loadProjectManifest.mockImplementation((projectPath) => {
    const manifestPath = manifestPathFor(projectPath);
    return manifest === null
      ? Err(makeProjectManifestMissingError(manifestPath)).toAsyncResult()
      : AsyncOk(manifest);
  });
}
