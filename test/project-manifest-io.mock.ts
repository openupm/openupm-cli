import * as projectManifestIoModule from "../src/io/project-manifest-io";
import {
  LoadProjectManifest,
  manifestPathFor,
} from "../src/io/project-manifest-io";
import { UnityProjectManifest } from "../src/domain/project-manifest";
import { Err, Ok } from "ts-results-es";
import { NotFoundError } from "../src/io/file-io";

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
      ? Err(new NotFoundError(manifestPath)).toAsyncResult()
      : Ok(manifest).toAsyncResult();
  });
}

/**
 * Creates a spy for saved project-manifests.
 */
export function spyOnSavedManifest() {
  return jest
    .spyOn(projectManifestIoModule, "trySaveProjectManifest")
    .mockReturnValue(Ok(undefined).toAsyncResult());
}
