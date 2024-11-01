import { loadProjectManifestUsing } from "../../../src/app/get-dependencies.js";
import { partialApply } from "../../../src/domain/fp-utils.js";
import { noopLogger } from "../../../src/domain/logging.js";
import { UnityProjectManifest } from "../../../src/domain/project-manifest.js";
import { readTextFile } from "../../../src/io/fs.js";

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
