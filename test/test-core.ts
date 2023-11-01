import "assert";
import fs from "fs";
import nock from "nock";
import path from "path";
import "should";
import {
  compareEditorVersion,
  env,
  fetchPackageInfo,
  loadManifest,
  parseEditorVersion,
  parseEnv,
  saveManifest,
} from "../src/core";

import {
  createWorkDir,
  getInspects,
  getOutputs,
  getWorkDir,
  nockDown,
  nockUp,
  removeWorkDir,
} from "./utils";
import testConsole from "test-console";
import assert from "assert";
import { isInternalPackage } from "../src/utils/pkg-name";

describe("cmd-core.ts", function () {
  describe("parseEnv", function () {
    let stdoutInspect: testConsole.Inspector = null!;
    let stderrInspect: testConsole.Inspector = null!;
    before(function () {
      removeWorkDir("test-openupm-cli");
      removeWorkDir("test-openupm-cli-no-manifest");
      createWorkDir("test-openupm-cli", {
        manifest: true,
        editorVersion: " 2019.2.13f1",
      });
      createWorkDir("test-openupm-cli-no-manifest", {
        manifest: false,
        editorVersion: " 2019.2.13f1",
      });
    });
    after(function () {
      removeWorkDir("test-openupm-cli");
      removeWorkDir("test-openupm-cli-no-manifest");
    });
    beforeEach(function () {
      [stdoutInspect, stderrInspect] = getInspects();
    });
    afterEach(function () {
      stdoutInspect.restore();
      stderrInspect.restore();
    });
    it("defaults", async function () {
      (await parseEnv({ _global: {} }, { checkPath: false })).should.be.ok();
      env.registry.should.equal("https://package.openupm.com");
      env.upstream.should.be.ok();
      env.upstreamRegistry.should.equal("https://packages.unity.com");
      env.namespace.should.equal("com.openupm");
      env.cwd.should.equal("");
      env.manifestPath.should.equal("");
      (env.editorVersion === null).should.be.ok();
    });
    it("check path", async function () {
      (
        await parseEnv(
          { _global: { chdir: getWorkDir("test-openupm-cli") } },
          { checkPath: true }
        )
      ).should.be.ok();
      env.cwd.should.be.equal(getWorkDir("test-openupm-cli"));
      env.manifestPath.should.be.equal(
        path.join(getWorkDir("test-openupm-cli"), "Packages/manifest.json")
      );
    });
    it("can not resolve path", async function () {
      (
        await parseEnv(
          { _global: { chdir: getWorkDir("path-not-exist") } },
          { checkPath: true }
        )
      ).should.not.be.ok();
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("can not resolve path").should.be.ok();
    });
    it("can not locate manifest.json", async function () {
      (
        await parseEnv(
          { _global: { chdir: getWorkDir("test-openupm-cli-no-manifest") } },
          { checkPath: true }
        )
      ).should.not.be.ok();
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("can not locate manifest.json").should.be.ok();
    });
    it("custom registry", async function () {
      (
        await parseEnv(
          { _global: { registry: "https://registry.npmjs.org" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("https://registry.npmjs.org");
      env.namespace.should.be.equal("org.npmjs");
    });
    it("custom registry with splash", async function () {
      (
        await parseEnv(
          { _global: { registry: "https://registry.npmjs.org/" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("https://registry.npmjs.org");
      env.namespace.should.be.equal("org.npmjs");
    });
    it("custom registry with extra path", async function () {
      (
        await parseEnv(
          { _global: { registry: "https://registry.npmjs.org/some" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("https://registry.npmjs.org/some");
      env.namespace.should.be.equal("org.npmjs");
    });
    it("custom registry with extra path and splash", async function () {
      (
        await parseEnv(
          { _global: { registry: "https://registry.npmjs.org/some/" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("https://registry.npmjs.org/some");
      env.namespace.should.be.equal("org.npmjs");
    });
    it("custom registry without http", async function () {
      (
        await parseEnv(
          { _global: { registry: "registry.npmjs.org" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("http://registry.npmjs.org");
      env.namespace.should.be.equal("org.npmjs");
    });
    it("custom registry with ipv4+port", async function () {
      (
        await parseEnv(
          { _global: { registry: "http://127.0.0.1:4873" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("http://127.0.0.1:4873");
      env.namespace.should.be.equal("127.0.0.1");
    });
    it("custom registry with ipv6+port", async function () {
      (
        await parseEnv(
          { _global: { registry: "http://[1:2:3:4:5:6:7:8]:4873" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("http://[1:2:3:4:5:6:7:8]:4873");
      env.namespace.should.be.equal("1:2:3:4:5:6:7:8");
    });
    it("upstream", async function () {
      (
        await parseEnv({ _global: { upstream: false } }, { checkPath: false })
      ).should.be.ok();
      env.upstream.should.not.be.ok();
    });
    it("editorVersion", async function () {
      (
        await parseEnv(
          { _global: { chdir: getWorkDir("test-openupm-cli") } },
          { checkPath: true }
        )
      ).should.be.ok();
      assert(env.editorVersion !== null);
      env.editorVersion.should.be.equal("2019.2.13f1");
    });
    it("region cn", async function () {
      (
        await parseEnv({ _global: { cn: true } }, { checkPath: false })
      ).should.be.ok();
      env.registry.should.be.equal("https://package.openupm.cn");
      env.upstreamRegistry.should.be.equal("https://packages.unity.cn");
      env.region.should.be.equal("cn");
    });
    it("region cn with a custom registry", async function () {
      (
        await parseEnv(
          { _global: { cn: true, registry: "https://reg.custom-package.com" } },
          { checkPath: false }
        )
      ).should.be.ok();
      env.registry.should.be.equal("https://reg.custom-package.com");
      env.upstreamRegistry.should.be.equal("https://packages.unity.cn");
      env.region.should.be.equal("cn");
    });
  });

  describe("loadManifest/SaveManifest", function () {
    let stdoutInspect: testConsole.Inspector = null!;
    let stderrInspect: testConsole.Inspector = null!;
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
      [stdoutInspect, stderrInspect] = getInspects();
    });
    afterEach(function () {
      removeWorkDir("test-openupm-cli");
      removeWorkDir("test-openupm-cli-wrong-json");
      stdoutInspect.restore();
      stderrInspect.restore();
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
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("does not exist").should.be.ok();
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
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("failed to parse").should.be.ok();
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

  describe("fetchPackageInfo", function () {
    beforeEach(function () {
      nockUp();
    });
    afterEach(function () {
      nockDown();
    });
    it("simple", async function () {
      (
        await parseEnv(
          { _global: { registry: "http://example.com" } },
          { checkPath: false }
        )
      ).should.be.ok();
      const pkgInfoRemote = { name: "com.littlebigfun.addressable-importer" };
      nock("http://example.com")
        .get("/package-a")
        .reply(200, pkgInfoRemote, { "Content-Type": "application/json" });
      const info = await fetchPackageInfo("package-a");
      assert(info !== undefined);
      info.should.deepEqual(pkgInfoRemote);
    });
    it("404", async function () {
      (
        await parseEnv(
          { _global: { registry: "http://example.com" } },
          { checkPath: false }
        )
      ).should.be.ok();

      nock("http://example.com").get("/package-a").reply(404);
      const info = await fetchPackageInfo("package-a");
      (info === undefined).should.be.ok();
    });
  });

  describe("parseEditorVersion", function () {
    it("test null", function () {
      (parseEditorVersion(null) === null).should.be.ok();
    });
    it("test x.y", function () {
      const version = parseEditorVersion("2019.2");
      assert(version !== null);
      version.should.deepEqual({ major: 2019, minor: 2 });
    });
    it("test x.y.z", function () {
      const version = parseEditorVersion("2019.2.1");
      assert(version !== null);
      version.should.deepEqual({
        major: 2019,
        minor: 2,
        patch: 1,
      });
    });
    it("test x.y.zan", function () {
      const version = parseEditorVersion("2019.2.1a5");
      assert(version !== null);
      version.should.deepEqual({
        major: 2019,
        minor: 2,
        patch: 1,
        flag: "a",
        flagValue: 0,
        build: 5,
      });
    });
    it("test x.y.zbn", function () {
      const version = parseEditorVersion("2019.2.1b5");
      assert(version !== null);
      version.should.deepEqual({
        major: 2019,
        minor: 2,
        patch: 1,
        flag: "b",
        flagValue: 1,
        build: 5,
      });
    });
    it("test x.y.zfn", function () {
      const version = parseEditorVersion("2019.2.1f5");
      assert(version !== null);
      version.should.deepEqual({
        major: 2019,
        minor: 2,
        patch: 1,
        flag: "f",
        flagValue: 2,
        build: 5,
      });
    });
    it("test x.y.zcn", function () {
      const version = parseEditorVersion("2019.2.1f1c5");
      assert(version !== null);
      version.should.deepEqual({
        major: 2019,
        minor: 2,
        patch: 1,
        flag: "f",
        flagValue: 2,
        build: 1,
        loc: "c",
        locValue: 1,
        locBuild: 5,
      });
    });
    it("test invalid version", function () {
      (parseEditorVersion("2019") === null).should.be.ok();
    });
  });

  describe("compareEditorVersion", function () {
    it("test 2019.1 == 2019.1", function () {
      compareEditorVersion("2019.1", "2019.1").should.equal(0);
    });
    it("test 2019.1.1 == 2019.1.1", function () {
      compareEditorVersion("2019.1.1", "2019.1.1").should.equal(0);
    });
    it("test 2019.1.1f1 == 2019.1.1f1", function () {
      compareEditorVersion("2019.1.1f1", "2019.1.1f1").should.equal(0);
    });
    it("test 2019.1.1f1c1 == 2019.1.1f1c1", function () {
      compareEditorVersion("2019.1.1f1c1", "2019.1.1f1c1").should.equal(0);
    });
    it("test 2019.2 > 2019.1", function () {
      compareEditorVersion("2019.2", "2019.1").should.equal(1);
    });
    it("test 2020.2 > 2019.1", function () {
      compareEditorVersion("2020.1", "2019.1").should.equal(1);
    });
    it("test 2019.1 < 2019.2", function () {
      compareEditorVersion("2019.1", "2019.2").should.equal(-1);
    });
    it("test 2019.1 < 2020.1", function () {
      compareEditorVersion("2019.1", "2020.1").should.equal(-1);
    });
    it("test 2019.1 < 2019.1.1", function () {
      compareEditorVersion("2019.1", "2019.1.1").should.equal(-1);
    });
    it("test 2019.1.1 < 2019.1.1f1", function () {
      compareEditorVersion("2019.1.1", "2019.1.1f1").should.equal(-1);
    });
    it("test 2019.1.1a1 < 2020.1.1b1", function () {
      compareEditorVersion("2019.1.1a1", "2020.1.1b1").should.equal(-1);
    });
    it("test 2019.1.1b1 < 2020.1.1f1", function () {
      compareEditorVersion("2019.1.1b1", "2020.1.1f1").should.equal(-1);
    });
    it("test 2019.1.1f1 < 2020.1.1f1c1", function () {
      compareEditorVersion("2019.1.1f1", "2020.1.1f1c1").should.equal(-1);
    });
  });
});
