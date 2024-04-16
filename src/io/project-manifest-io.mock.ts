import * as projectManifestIoModule from "./project-manifest-io";
import { manifestPathFor } from "./project-manifest-io";
import { UnityProjectManifest } from "../domain/project-manifest";
import { Err, Ok } from "ts-results-es";
import { NotFoundError } from "./file-io";

/**
 * Mocks results for calls to {@link tryLoadProjectManifest}.
 * @param manifest The manifest that should be returned. Null if there should
 * be no manifest.
 */
export function mockProjectManifest(manifest: UnityProjectManifest | null) {
  return jest
    .spyOn(projectManifestIoModule, "tryLoadProjectManifest")
    .mockImplementation((projectPath) => {
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
