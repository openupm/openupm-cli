const _ = require("lodash");
const fse = require("fs-extra");
const nock = require("nock");
const path = require("path");
const os = require("os");
const testConsole = require("test-console");

const getWorkDir = function(pathToTmp) {
  return path.join(os.tmpdir(), pathToTmp);
};

const createWorkDir = function(pathToTmp, { manifest }) {
  const workDir = getWorkDir(pathToTmp);
  fse.mkdirpSync(workDir);
  if (manifest) {
    if (!_.isObjectLike(manifest)) manifest = { dependencies: {} };
    const manifestDir = path.join(workDir, "Packages");
    fse.mkdirpSync(manifestDir);
    const data = JSON.stringify(manifest);
    fse.writeFileSync(path.join(manifestDir, "manifest.json"), data);
  }
};

const removeWorkDir = function(pathToTmp) {
  const cwd = getWorkDir(pathToTmp);
  fse.removeSync(cwd);
};

const nockUp = function() {
  if (!nock.isActive()) nock.activate();
};

const nockDown = function() {
  nock.restore();
  nock.cleanAll();
};

const getOutputs = function(stdouInspect, stderrInsepct) {
  const results = [stdouInspect.output.join(""), stderrInsepct.output.join("")];
  stdouInspect.restore();
  stderrInsepct.restore();
  return results;
};

const getInspects = function() {
  const stdoutInspect = testConsole.stdout.inspect();
  const stderrInspect = testConsole.stderr.inspect();
  return [stdoutInspect, stderrInspect];
};

module.exports = {
  getWorkDir,
  createWorkDir,
  removeWorkDir,
  nockUp,
  nockDown,
  getInspects,
  getOutputs
};
