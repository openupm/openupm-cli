const fse = require("fs-extra");
const nock = require("nock");
const path = require("path");
const os = require("os");

const getWorkDir = function(pathToTmp) {
  return path.join(os.tmpdir(), pathToTmp);
};

const createWorkDir = function(pathToTmp, { withManifest }) {
  const workDir = getWorkDir(pathToTmp);
  fse.mkdirpSync(workDir);
  if (withManifest) {
    const manifestDir = path.join(workDir, "Packages");
    fse.mkdirpSync(manifestDir);
    const data = JSON.stringify({ dependencies: {} });
    fse.writeFileSync(path.join(manifestDir, "manifest.json"), data);
  }
};

const removeWorkDir = function(pathToTmp) {
  const cwd = getWorkDir(pathToTmp);
  fse.removeSync(cwd);
};

function captureStream(stream) {
  var oldWrite = stream.write;
  var buf = "";
  stream.write = function(chunk, encoding, callback) {
    buf += chunk.toString(); // chunk is a String or Buffer
    oldWrite.apply(stream, arguments);
  };

  return {
    unhook: function unhook() {
      stream.write = oldWrite;
    },
    captured: function() {
      return buf;
    }
  };
}

const nockUp = function() {
  if (!nock.isActive()) nock.activate();
};

const nockDown = function() {
  nock.restore();
  nock.cleanAll();
};

module.exports = {
  getWorkDir,
  createWorkDir,
  removeWorkDir,
  captureStream,
  nockUp,
  nockDown
};
