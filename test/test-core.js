/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const assert = require("assert");
const fs = require("fs");
const nock = require("nock");
const path = require("path");
const should = require("should");
const {
  env,
  getCache,
  parseEnv,
  parseName,
  loadManifest,
  saveManifest,
  fetchPackageInfo,
  getLatestVersion
} = require("../lib/core");
const {
  getWorkDir,
  createWorkDir,
  removeWorkDir,
  getInspects,
  getOutputs,
  nockUp,
  nockDown
} = require("./utils");

describe("cmd-core.js", function() {
  describe("parseName", function() {
    it("pkg@version", function() {
      parseName("pkg@1.0.0").should.deepEqual({
        name: "pkg",
        version: "1.0.0"
      });
    });
    it("pkg@latest", function() {
      parseName("pkg@latest").should.deepEqual({
        name: "pkg",
        version: "latest"
      });
    });
    it("pkg", function() {
      parseName("pkg").should.deepEqual({
        name: "pkg",
        version: undefined
      });
    });
    it("pkg@file", function() {
      parseName("pkg@file:../pkg").should.deepEqual({
        name: "pkg",
        version: "file:../pkg"
      });
    });
    it("pkg@http", function() {
      parseName("pkg@https://github.com/owner/pkg").should.deepEqual({
        name: "pkg",
        version: "https://github.com/owner/pkg"
      });
    });
    it("pkg@git", function() {
      parseName("pkg@git@github.com:owner/pkg.git").should.deepEqual({
        name: "pkg",
        version: "git@github.com:owner/pkg.git"
      });
    });
  });

  describe("parseEnv", function() {
    let stdoutInspect = null;
    let stderrInspect = null;
    before(function() {
      removeWorkDir("test-openupm-cli");
      removeWorkDir("test-openupm-cli-no-manifest");
      createWorkDir("test-openupm-cli", { manifest: true });
      createWorkDir("test-openupm-cli-no-manifest", { manifest: false });
    });
    after(function() {
      removeWorkDir("test-openupm-cli");
      removeWorkDir("test-openupm-cli-no-manifest");
    });
    beforeEach(function() {
      [stdoutInspect, stderrInspect] = getInspects();
    });
    afterEach(function() {
      stdoutInspect.restore();
      stderrInspect.restore();
    });
    it("defaults", async function() {
      (await parseEnv({ parent: {} }, { checkPath: false })).should.be.ok();
      env.registry.should.equal("https://package.openupm.com");
      env.upstream.should.be.ok();
      env.upstreamRegistry.should.equal("https://packages.unity.com");
      env.namespace.should.equal("com.openupm");
      env.cwd.should.equal("");
      env.manifestPath.should.equal("");
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
    });
    it("check path", async function() {
      (
        await parseEnv(
          { parent: { chdir: getWorkDir("test-openupm-cli") } },
          { checkPath: true }
        )
      ).should.be.ok();
      env.cwd.should.be.equal(getWorkDir("test-openupm-cli"));
      env.manifestPath.should.be.equal(
        path.join(getWorkDir("test-openupm-cli"), "Packages/manifest.json")
      );
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
    });
    it("can not resolve path", async function() {
      (
        await parseEnv(
          { parent: { chdir: getWorkDir("path-not-exist") } },
          { checkPath: true }
        )
      ).should.not.be.ok();
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("can not resolve path").should.be.ok();
    });
    it("can not locate manifest.json", async function() {
      (
        await parseEnv(
          { parent: { chdir: getWorkDir("test-openupm-cli-no-manifest") } },
          { checkPath: true }
        )
      ).should.not.be.ok();
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("can not locate manifest.json").should.be.ok();
    });
    it("custom registry", async function() {
      (
        await parseEnv(
          { parent: { registry: "https://registry.npmjs.org" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("https://registry.npmjs.org");
      env.namespace.should.be.equal("org.npmjs");
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
    });
    it("custom registry with splash", async function() {
      (
        await parseEnv(
          { parent: { registry: "https://registry.npmjs.org/" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("https://registry.npmjs.org");
      env.namespace.should.be.equal("org.npmjs");
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
    });
    it("custom registry with extra path", async function() {
      (
        await parseEnv(
          { parent: { registry: "https://registry.npmjs.org/some" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("https://registry.npmjs.org/some");
      env.namespace.should.be.equal("org.npmjs");
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
    });
    it("custom registry with extra path and splash", async function() {
      (
        await parseEnv(
          { parent: { registry: "https://registry.npmjs.org/some/" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("https://registry.npmjs.org/some");
      env.namespace.should.be.equal("org.npmjs");
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
    });
    it("custom registry without http", async function() {
      (
        await parseEnv(
          { parent: { registry: "registry.npmjs.org" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("http://registry.npmjs.org");
      env.namespace.should.be.equal("org.npmjs");
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
    });
    it("custom registry with ipv4+port", async function() {
      (
        await parseEnv(
          { parent: { registry: "http://127.0.0.1:4873" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("http://127.0.0.1:4873");
      env.namespace.should.be.equal("127.0.0.1");
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
    });
    it("custom registry with ipv6+port", async function() {
      (
        await parseEnv(
          { parent: { registry: "http://[1:2:3:4:5:6:7:8]:4873" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("http://[1:2:3:4:5:6:7:8]:4873");
      env.namespace.should.be.equal("1:2:3:4:5:6:7:8");
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
    });
    it("upstream", async function() {
      (
        await parseEnv({ parent: { upstream: false } }, { checkPath: false })
      ).should.be.ok();
      env.upstream.should.not.be.ok();
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
    });
  });

  describe("loadManifest/SaveManifest", function() {
    let stdoutInspect = null;
    let stderrInspect = null;
    beforeEach(function() {
      removeWorkDir("test-openupm-cli");
      createWorkDir("test-openupm-cli", { manifest: true });
      createWorkDir("test-openupm-cli-wrong-json", {
        manifest: true
      });
      fs.writeFileSync(
        path.join(
          getWorkDir("test-openupm-cli-wrong-json"),
          "Packages/manifest.json"
        ),
        "wrong-json"
      );
      [stdoutInspect, stderrInspect] = getInspects();
    });
    afterEach(function() {
      removeWorkDir("test-openupm-cli");
      removeWorkDir("test-openupm-cli-wrong-json");
      stdoutInspect.restore();
      stderrInspect.restore();
    });
    it("loadManifest", async function() {
      (
        await parseEnv(
          { parent: { chdir: getWorkDir("test-openupm-cli") } },
          { checkPath: true }
        )
      ).should.be.ok();
      const manifest = loadManifest();
      manifest.should.be.deepEqual({ dependencies: {} });
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
    });
    it("no manifest file", async function() {
      (
        await parseEnv(
          { parent: { chdir: getWorkDir("path-not-exist") } },
          { checkPath: false }
        )
      ).should.be.ok();
      const manifest = loadManifest();
      (manifest === null).should.be.ok();
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("does not exist").should.be.ok();
    });
    it("wrong json content", async function() {
      (
        await parseEnv(
          { parent: { chdir: getWorkDir("test-openupm-cli-wrong-json") } },
          { checkPath: true }
        )
      ).should.be.ok();
      const manifest = loadManifest();
      (manifest === null).should.be.ok();
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("failed to parse").should.be.ok();
    });
    it("saveManifest", async function() {
      (
        await parseEnv(
          { parent: { chdir: getWorkDir("test-openupm-cli") } },
          { checkPath: true }
        )
      ).should.be.ok();
      const manifest = loadManifest();
      manifest.should.be.deepEqual({ dependencies: {} });
      manifest.dependencies["some-pack"] = "1.0.0";
      saveManifest(manifest).should.be.ok();
      const manifest2 = loadManifest();
      manifest2.should.be.deepEqual(manifest);
      const [stdout, stderr] = getOutputs(stdoutInspect, stderrInspect);
    });
  });

  describe("getCache", function() {
    it("simple", function() {
      const cache = getCache();
      (cache === null).should.be.false();
      (cache === undefined).should.be.false();
    });
  });

  describe("fetchPackageInfo", function() {
    beforeEach(function() {
      nockUp();
    });
    afterEach(function() {
      nockDown();
    });
    it("simple", async function() {
      (
        await parseEnv(
          { parent: { registry: "http://example.com" } },
          { checkPath: false }
        )
      ).should.be.ok();
      let pkgInfoRemote = { name: "com.littlebigfun.addressable-importer" };
      nock("http://example.com")
        .get("/package-a")
        .reply(200, pkgInfoRemote, { "Content-Type": "application/json" });
      const info = await fetchPackageInfo("package-a");
      info.should.deepEqual(pkgInfoRemote);
    });
    it("404", async function() {
      (
        await parseEnv(
          { parent: { registry: "http://example.com" } },
          { checkPath: false }
        )
      ).should.be.ok();
      let pkgInfoRemote = { name: "com.littlebigfun.addressable-importer" };
      nock("http://example.com")
        .get("/package-a")
        .reply(404);
      const info = await fetchPackageInfo("package-a");
      (info === undefined).should.be.ok();
    });
  });
  describe("getLatestVersion", function() {
    it("from dist-tags", async function() {
      getLatestVersion({ "dist-tags": { latest: "1.0.0" } }).should.equal(
        "1.0.0"
      );
    });
    it("from versions", async function() {
      getLatestVersion({ versions: { "1.0.0": "latest" } }).should.equal(
        "1.0.0"
      );
    });
    it("not found", async function() {
      (
        getLatestVersion({ versions: { "1.0.0": "patch" } }) === undefined
      ).should.be.ok();
      (getLatestVersion({}) === undefined).should.be.ok();
    });
  });
});
