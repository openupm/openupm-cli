import _ from "lodash";
import fse from "fs-extra";
import nock from "nock";
import path from "path";
import os from "os";
import testConsole from "test-console";

export const getWorkDir = function (pathToTmp) {
  return path.join(os.tmpdir(), pathToTmp);
};

export const createWorkDir = function (pathToTmp, { manifest, editorVersion }) {
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

export const removeWorkDir = function (pathToTmp) {
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

export const getOutputs = function (stdouInspect, stderrInsepct) {
  const results = [stdouInspect.output.join(""), stderrInsepct.output.join("")];
  stdouInspect.restore();
  stderrInsepct.restore();
  return results;
};

export const getInspects = function () {
  const stdoutInspect = testConsole.stdout.inspect();
  const stderrInspect = testConsole.stderr.inspect();
  return [stdoutInspect, stderrInspect];
};
