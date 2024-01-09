import path from "path";
import os from "os";
import fse from "fs-extra";
import _ from "lodash";
import {
  emptyProjectManifest,
  UnityProjectManifest,
} from "../src/types/project-manifest";
import { createProjectVersionTxt } from "../src/utils/project-version-io";

export type ManifestCreationOptions = {
  manifest: boolean | UnityProjectManifest;
  editorVersion?: string;
};
export const getWorkDir = function (pathToTmp: string): string {
  return path.join(os.tmpdir(), pathToTmp);
};

export const createWorkDir = function (
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
    createProjectVersionTxt(workDir, editorVersion);
  }
  return workDir;
};
export const removeWorkDir = function (pathToTmp: string) {
  const cwd = getWorkDir(pathToTmp);
  fse.removeSync(cwd);
};
