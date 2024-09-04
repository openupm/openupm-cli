import { UnityProjectManifest } from "../../../src/domain/project-manifest";
import { loadProjectManifestUsing } from "../../../src/io/project-manifest-io";
import { readTextFile } from "../../../src/io/text-file-io";
import { noopLogger } from "../../../src/logging";
import { partialApply } from "../../../src/utils/fp-utils";

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
