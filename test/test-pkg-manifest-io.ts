import { attachMockConsole, MockConsole } from "./mock-console";
import fs from "fs";
import "should";
import path from "path";
import { saveManifest } from "../src/utils/pkg-manifest-io";
import { describe } from "mocha";
import { env, parseEnv } from "../src/utils/env";
import { createWorkDir, getWorkDir, removeWorkDir } from "./mock-work-dir";
import {
  shouldHaveManifest,
  shouldHaveNoManifest,
  shouldNotHaveAnyDependencies,
} from "./manifest-assertions";
import { domainName } from "../src/types/domain-name";
import { semanticVersion } from "../src/types/semantic-version";
import { addDependency, manifestPathFor } from "../src/types/pkg-manifest";
import should from "should";

describe("pkg-manifest io", function () {
  let mockConsole: MockConsole = null!;
  beforeEach(function () {
    removeWorkDir("test-openupm-cli");
    createWorkDir("test-openupm-cli", { manifest: true });
    createWorkDir("test-openupm-cli-wrong-json", {
      manifest: true,
    });
    fs.writeFileSync(
      path.join(
        getWorkDir("test-openupm-cli-wrong-json"),
        "Packages/manifest.json"
      ),
      "wrong-json"
    );
    mockConsole = attachMockConsole();
  });
  afterEach(function () {
    removeWorkDir("test-openupm-cli");
    removeWorkDir("test-openupm-cli-wrong-json");
    mockConsole.detach();
  });
  it("loadManifest", async function () {
    (
      await parseEnv(
        { _global: { chdir: getWorkDir("test-openupm-cli") } },
        true
      )
    ).should.be.ok();
    const manifest = shouldHaveManifest(env.cwd);
    manifest.should.be.deepEqual({ dependencies: {} });
  });
  it("no manifest file", async function () {
    (
      await parseEnv(
        { _global: { chdir: getWorkDir("path-not-exist") } },
        false
      )
    ).should.be.ok();
    shouldHaveNoManifest(env.cwd);
    mockConsole.hasLineIncluding("out", "does not exist").should.be.ok();
  });
  it("wrong json content", async function () {
    (
      await parseEnv(
        { _global: { chdir: getWorkDir("test-openupm-cli-wrong-json") } },
        true
      )
    ).should.be.ok();
    shouldHaveNoManifest(env.cwd);
    mockConsole.hasLineIncluding("out", "failed to parse").should.be.ok();
  });
  it("saveManifest", async function () {
    (
      await parseEnv(
        { _global: { chdir: getWorkDir("test-openupm-cli") } },
        true
      )
    ).should.be.ok();
    const manifest = shouldHaveManifest(env.cwd);
    shouldNotHaveAnyDependencies(manifest);
    addDependency(manifest, domainName("some-pack"), semanticVersion("1.0.0"));
    saveManifest(env.cwd, manifest).should.be.ok();
    const manifest2 = shouldHaveManifest(env.cwd);
    manifest2.should.be.deepEqual(manifest);
  });
  it("manifest-path is correct", function () {
    const manifestPath = manifestPathFor("test-openupm-cli");
    should(manifestPath).be.equal("test-openupm-cli/Packages/manifest.json");
  });
});
