import path from "path";
import os from "os";
import fse from "fs-extra";
import _ from "lodash";
import {
  emptyProjectManifest,
  UnityProjectManifest,
} from "../src/types/project-manifest";

export type ManifestCreationOptions = {
  manifest: boolean | UnityProjectManifest;
  editorVersion?: string;
};

export function getWorkDir(pathToTmp: string): string {
  return path.join(os.tmpdir(), pathToTmp);
}

export function createWorkDir(
  pathToTmp: string,
  { manifest, editorVersion }: ManifestCreationOptions
): string {
  const workDir = getWorkDir(pathToTmp);
  fse.mkdirpSync(workDir);
  if (manifest) {
    if (!_.isObjectLike(manifest)) manifest = emptyProjectManifest();
    const manifestDir = path.join(workDir, "Packages");
    fse.mkdirpSync(manifestDir);
    const data = JSON.stringify(manifest);
    fse.writeFileSync(path.join(manifestDir, "manifest.json"), data);
  }
  if (editorVersion) {
    const projectSettingsDir = path.join(workDir, "ProjectSettings");
    fse.mkdirpSync(projectSettingsDir);
    const data = `m_EditorVersion: ${editorVersion}`;
    fse.writeFileSync(
      path.join(projectSettingsDir, "ProjectVersion.txt"),
      data
    );
  }
  return workDir;
}

export function removeWorkDir(pathToTmp: string) {
  const cwd = getWorkDir(pathToTmp);
  fse.removeSync(cwd);
}
