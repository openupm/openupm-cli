import {
  manifestPathFor,
  serializeProjectManifest,
  UnityProjectManifest,
} from "../domain/project-manifest";
import { WriteTextFile } from "../io/fs";

/**
 * Function for replacing the project manifest for a Unity project.
 * @param writeFile IO function for overwriting the content of the manifest
 * file.
 * @param projectPath The path to the project's directory.
 * @param manifest The manifest to write to the project.
 */
export async function saveProjectManifestUsing(
  writeFile: WriteTextFile,
  projectPath: string,
  manifest: UnityProjectManifest
): Promise<void> {
  const manifestPath = manifestPathFor(projectPath);
  const content = serializeProjectManifest(manifest);
  return await writeFile(manifestPath, content);
}
