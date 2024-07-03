import fse from "fs-extra";
import path from "path";
import { projectVersionTxtPathFor } from "../../../src/io/project-version-io";
import yaml from "yaml";
import { emptyProjectManifest } from "../../../src/domain/project-manifest";
import { makeWriteProjectManifest } from "../../../src/io/project-manifest-io";
import { makeWriteText } from "../../../src/io/text-file-io";
import { noopLogger } from "../../../src/logging";
import { dropDirectory } from "./directories";

export type ProjectOptions = {};

const writeFile = makeWriteText(noopLogger);
const writeProjectManifest = makeWriteProjectManifest(writeFile);

export async function prepareUnityProject(
  homeDirectory: string,
  options: ProjectOptions = {}
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

  const manifest = emptyProjectManifest;
  (await writeProjectManifest(projectDir, manifest).promise).unwrap();

  return projectDir;
}
