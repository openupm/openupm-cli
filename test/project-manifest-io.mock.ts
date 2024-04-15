import * as projectManifestIoModule from "../src/io/project-manifest-io";
import { UnityProjectManifest } from "../src/domain/project-manifest";
import { Err, Ok } from "ts-results-es";
import { NotFoundError } from "../src/io/file-io";
import { manifestPathFor } from "../src/io/project-manifest-io";

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
  return jest.spyOn(projectManifestIoModule, "trySaveProjectManifest");
}
