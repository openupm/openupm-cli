import path from "path";
import os from "os";
import fse from "fs-extra";
import _ from "lodash";
import { emptyPackageManifest, PkgManifest } from "../src/types/pkg-manifest";

export type ManifestCreationOptions = {
  manifest: boolean | PkgManifest;
  editorVersion?: string;
};
export const getWorkDir = function (pathToTmp: string): string {
  return path.join(os.tmpdir(), pathToTmp);
};
export const createWorkDir = function (
  pathToTmp: string,
  { manifest, editorVersion }: ManifestCreationOptions
) {
  const workDir = getWorkDir(pathToTmp);
  fse.mkdirpSync(workDir);
  if (manifest) {
    if (!_.isObjectLike(manifest)) manifest = emptyPackageManifest();
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
};
export const removeWorkDir = function (pathToTmp: string) {
  const cwd = getWorkDir(pathToTmp);
  fse.removeSync(cwd);
};
