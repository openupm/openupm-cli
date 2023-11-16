import { attachMockConsole, MockConsole } from "./mock-console";
import fs from "fs";
import "should";
import path from "path";
import { loadManifest, saveManifest } from "../src/utils/manifest";
import assert from "assert";
import { describe } from "mocha";
import { parseEnv } from "../src/utils/env";
import { createWorkDir, getWorkDir, removeWorkDir } from "./mock-work-dir";

describe("manifest", function () {
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
        { checkPath: true }
      )
    ).should.be.ok();
    const manifest = loadManifest();
    assert(manifest !== null);
    manifest.should.be.deepEqual({ dependencies: {} });
  });
  it("no manifest file", async function () {
    (
      await parseEnv(
        { _global: { chdir: getWorkDir("path-not-exist") } },
        { checkPath: false }
      )
    ).should.be.ok();
    const manifest = loadManifest();
    (manifest === null).should.be.ok();
    mockConsole.hasLineIncluding("out", "does not exist").should.be.ok();
  });
  it("wrong json content", async function () {
    (
      await parseEnv(
        { _global: { chdir: getWorkDir("test-openupm-cli-wrong-json") } },
        { checkPath: true }
      )
    ).should.be.ok();
    const manifest = loadManifest();
    (manifest === null).should.be.ok();
    mockConsole.hasLineIncluding("out", "failed to parse").should.be.ok();
  });
  it("saveManifest", async function () {
    (
      await parseEnv(
        { _global: { chdir: getWorkDir("test-openupm-cli") } },
        { checkPath: true }
      )
    ).should.be.ok();
    const manifest = loadManifest();
    assert(manifest !== null);
    manifest.should.be.deepEqual({ dependencies: {} });
    manifest.dependencies["some-pack"] = "1.0.0";
    saveManifest(manifest).should.be.ok();
    const manifest2 = loadManifest();
    assert(manifest2 !== null);
    manifest2.should.be.deepEqual(manifest);
  });
});
