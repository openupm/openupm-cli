import { attachMockConsole, MockConsole } from "./mock-console";
import fs from "fs";
import "should";
import { saveProjectManifest } from "../src/utils/project-manifest-io";
import { describe } from "mocha";
import { createWorkDir, getWorkDir, removeWorkDir } from "./mock-work-dir";
import {
  shouldHaveNoProjectManifest,
  shouldHaveProjectManifest,
  shouldNotHaveAnyDependencies,
} from "./project-manifest-assertions";
import { domainName } from "../src/types/domain-name";
import { semanticVersion } from "../src/types/semantic-version";
import { addDependency, manifestPathFor } from "../src/types/project-manifest";
import should from "should";

const workDirName = "test-openupm-cli";
const wrongJsonWorkDirName = "test-openupm-cli-wrong-json";

describe("project-manifest io", function () {
  let mockConsole: MockConsole = null!;
  let workDir = "";
  let wrongJsonWorkDir = "";

  beforeEach(function () {
    removeWorkDir(workDirName);
    workDir = createWorkDir(workDirName, { manifest: true });
    wrongJsonWorkDir = createWorkDir(wrongJsonWorkDirName, {
      manifest: true,
    });
    fs.writeFileSync(
      manifestPathFor(getWorkDir(wrongJsonWorkDirName)),
      "wrong-json"
    );
    mockConsole = attachMockConsole();
  });
  afterEach(function () {
    removeWorkDir(workDirName);
    removeWorkDir(wrongJsonWorkDirName);
    mockConsole.detach();
  });
  it("loadManifest", async function () {
    const manifest = shouldHaveProjectManifest(workDir);
    manifest.should.be.deepEqual({ dependencies: {} });
  });
  it("no manifest file", async function () {
    shouldHaveNoProjectManifest("path-not-exist");
    mockConsole.hasLineIncluding("out", "does not exist").should.be.ok();
  });
  it("wrong json content", async function () {
    shouldHaveNoProjectManifest(wrongJsonWorkDir);
    mockConsole.hasLineIncluding("out", "failed to parse").should.be.ok();
  });
  it("saveManifest", async function () {
    const manifest = shouldHaveProjectManifest(workDir);
    shouldNotHaveAnyDependencies(manifest);
    addDependency(manifest, domainName("some-pack"), semanticVersion("1.0.0"));
    saveProjectManifest(workDir, manifest).should.be.ok();
    const manifest2 = shouldHaveProjectManifest(workDir);
    manifest2.should.be.deepEqual(manifest);
  });
  it("manifest-path is correct", function () {
    const manifestPath = manifestPathFor(workDirName);
    should(manifestPath).be.equal("test-openupm-cli/Packages/manifest.json");
  });
});
