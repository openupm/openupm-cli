import { loadProjectManifestUsing } from "../../../src/app/get-dependencies";
import { partialApply } from "../../../src/domain/fp-utils";
import { noopLogger } from "../../../src/domain/logging";
import { UnityProjectManifest } from "../../../src/domain/project-manifest";
import { readTextFile } from "../../../src/io/fs";

const loadProjectManifest = partialApply(
  loadProjectManifestUsing,
  readTextFile,
  noopLogger
);

/**
 * Loads the project manifest based on the project directory.
 * @param projectDirectory The directory.
 * @returns The manifest.
 */
export async function getProjectManifest(
  projectDirectory: string
): Promise<UnityProjectManifest> {
  return await loadProjectManifest(projectDirectory);
}
