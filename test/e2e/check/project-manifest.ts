import { UnityProjectManifest } from "../../../src/domain/project-manifest";
import { makeLoadProjectManifest } from "../../../src/io/project-manifest-io";
import { makeReadText } from "../../../src/io/text-file-io";
import { noopLogger } from "../../../src/logging";

const readText = makeReadText(noopLogger);
const loadProjectManifest = makeLoadProjectManifest(readText);

export async function getProjectManifest(
  projectDirectory: string
): Promise<UnityProjectManifest> {
  return await loadProjectManifest(projectDirectory);
}
