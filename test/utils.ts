import fse from "fs-extra";
import nock from "nock";
import path from "path";
import os from "os";
import testConsole from "test-console";
import { PkgManifest } from "../src/types/global";
import _ from "lodash";

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
    if (!_.isObjectLike(manifest)) manifest = { dependencies: {} };
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

export const nockUp = function () {
  if (!nock.isActive()) nock.activate();
};

export const nockDown = function () {
  nock.restore();
  nock.cleanAll();
};

export const getOutputs = function (
  stdouInspect: testConsole.Inspector,
  stderrInsepct: testConsole.Inspector
): [string, string] {
  const results: [string, string] = [
    stdouInspect.output.join(""),
    stderrInsepct.output.join(""),
  ];
  stdouInspect.restore();
  stderrInsepct.restore();
  return results;
};

export const getInspects = function (): [
  testConsole.Inspector,
  testConsole.Inspector
] {
  const stdoutInspect = testConsole.stdout.inspect();
  const stderrInspect = testConsole.stderr.inspect();
  return [stdoutInspect, stderrInspect];
};
