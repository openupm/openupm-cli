import "should";
import { parseEnv } from "../src/utils/env";
import { createWorkDir, getWorkDir, removeWorkDir } from "./mock-work-dir";
import { attachMockConsole, MockConsole } from "./mock-console";
import should from "should";

describe("env", function () {
  describe("parseEnv", function () {
    let mockConsole: MockConsole = null!;
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
      mockConsole = attachMockConsole();
    });
    afterEach(function () {
      mockConsole.detach();
    });
    it("defaults", async function () {
      const env = await parseEnv({ _global: {} }, false);
      should(env).not.be.null();
      env!.registry.should.equal("https://package.openupm.com");
      env!.upstream.should.be.ok();
      env!.upstreamRegistry.should.equal("https://packages.unity.com");
      env!.namespace.should.equal("com.openupm");
      env!.cwd.should.equal("");
      (env!.editorVersion === null).should.be.ok();
    });
    it("check path", async function () {
      const env = await parseEnv(
        { _global: { chdir: getWorkDir("test-openupm-cli") } },
        true
      );
      should(env).not.be.null();
      env!.cwd.should.be.equal(getWorkDir("test-openupm-cli"));
    });
    it("can not resolve path", async function () {
      const env = await parseEnv(
        { _global: { chdir: getWorkDir("path-not-exist") } },
        true
      );
      should(env).be.null();
      mockConsole
        .hasLineIncluding("out", "can not resolve path")
        .should.be.ok();
    });
    it("can not locate manifest.json", async function () {
      const env = await parseEnv(
        { _global: { chdir: getWorkDir("test-openupm-cli-no-manifest") } },
        true
      );
      should(env).be.null();
      mockConsole
        .hasLineIncluding("out", "can not locate manifest.json")
        .should.be.ok();
    });
    it("custom registry", async function () {
      const env = await parseEnv(
        { _global: { registry: "https://registry.npmjs.org" } },
        false
      );
      should(env).not.be.null();
      env!.registry.should.be.equal("https://registry.npmjs.org");
      env!.namespace.should.be.equal("org.npmjs");
    });
    it("custom registry with splash", async function () {
      const env = await parseEnv(
        { _global: { registry: "https://registry.npmjs.org/" } },
        false
      );
      should(env).not.be.null();
      env!.registry.should.be.equal("https://registry.npmjs.org");
      env!.namespace.should.be.equal("org.npmjs");
    });
    it("custom registry with extra path", async function () {
      const env = await parseEnv(
        {
          _global: {
            registry: "https://registry.npmjs.org/some",
          },
        },
        false
      );
      should(env).not.be.null();
      env!.registry.should.be.equal("https://registry.npmjs.org/some");
      env!.namespace.should.be.equal("org.npmjs");
    });
    it("custom registry with extra path and splash", async function () {
      const env = await parseEnv(
        {
          _global: {
            registry: "https://registry.npmjs.org/some/",
          },
        },
        false
      );
      should(env).not.be.null();
      env!.registry.should.be.equal("https://registry.npmjs.org/some");
      env!.namespace.should.be.equal("org.npmjs");
    });
    it("custom registry without http", async function () {
      const env = await parseEnv(
        { _global: { registry: "registry.npmjs.org" } },
        false
      );
      should(env).not.be.null();
      env!.registry.should.be.equal("http://registry.npmjs.org");
      env!.namespace.should.be.equal("org.npmjs");
    });
    it("custom registry with ipv4+port", async function () {
      const env = await parseEnv(
        { _global: { registry: "http://127.0.0.1:4873" } },
        false
      );
      should(env).not.be.null();
      env!.registry.should.be.equal("http://127.0.0.1:4873");
      env!.namespace.should.be.equal("127.0.0.1");
    });
    it("custom registry with ipv6+port", async function () {
      const env = await parseEnv(
        {
          _global: { registry: "http://[1:2:3:4:5:6:7:8]:4873" },
        },
        false
      );
      should(env).not.be.null();
      env!.registry.should.be.equal("http://[1:2:3:4:5:6:7:8]:4873");
      env!.namespace.should.be.equal("1:2:3:4:5:6:7:8");
    });
    it("upstream", async function () {
      const env = await parseEnv({ _global: { upstream: false } }, false);
      should(env).not.be.null();
      env!.upstream.should.not.be.ok();
    });
    it("editorVersion", async function () {
      const env = await parseEnv(
        { _global: { chdir: getWorkDir("test-openupm-cli") } },
        true
      );
      should(env).not.be.null();
      should(env!.editorVersion).be.equal("2019.2.13f1");
    });
    it("region cn", async function () {
      const env = await parseEnv({ _global: { cn: true } }, false);
      should(env).not.be.null();
      env!.registry.should.be.equal("https://package.openupm.cn");
      env!.upstreamRegistry.should.be.equal("https://packages.unity.cn");
      env!.region.should.be.equal("cn");
    });
    it("region cn with a custom registry", async function () {
      const env = await parseEnv(
        {
          _global: {
            cn: true,
            registry: "https://reg.custom-package.com",
          },
        },
        false
      );
      should(env).not.be.null();
      env!.registry.should.be.equal("https://reg.custom-package.com");
      env!.upstreamRegistry.should.be.equal("https://packages.unity.cn");
      env!.region.should.be.equal("cn");
    });
  });
});
