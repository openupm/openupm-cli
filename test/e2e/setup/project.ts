import fse from "fs-extra";
import path from "path";
import yaml from "yaml";
import {
  emptyProjectManifest,
  UnityProjectManifest,
} from "../../../src/domain/project-manifest";
import { WriteProjectManifestFile } from "../../../src/io/project-manifest-io";
import { projectVersionTxtPathFor } from "../../../src/io/project-version-io";
import { writeTextFile } from "../../../src/io/text-file-io";
import { dropDirectory } from "./directories";

const writeProjectManifest = WriteProjectManifestFile(writeTextFile);

/**
 * Prepares a mock Unity project for testing.
 * @param homeDirectory The path to the users home directory. The project will
 * be placed in relation to this path.
 * @returns The path to the created project's directory.
 */
export async function prepareUnityProject(
  homeDirectory: string,
  options?: { manifest?: UnityProjectManifest }
): Promise<string> {
  const projectName = "MyProject";
  const projectDir = path.join(homeDirectory, projectName);
  await dropDirectory(projectDir);
  await fse.ensureDir(projectDir);

  const projectVersionText = "2021.3.36f1";
  const projectVersionTxtPath = projectVersionTxtPathFor(projectDir);
  await fse.ensureDir(path.dirname(projectVersionTxtPath));
  await fse.writeFile(
    projectVersionTxtPath,
    yaml.stringify({ m_EditorVersion: projectVersionText }),
    { encoding: "utf8" }
  );

  await writeProjectManifest(
    projectDir,
    options?.manifest ?? emptyProjectManifest
  );

  return projectDir;
}
