import "should";
import { parseEnv } from "../src/utils/env";
import { attachMockConsole, MockConsole } from "./mock-console";
import should from "should";
import { registryUrl } from "../src/types/registry-url";
import { TokenAuth, UPMConfig } from "../src/types/upm-config";
import { NpmAuth } from "another-npm-registry-client";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";
import { manifestPathFor } from "../src/types/project-manifest";
import fse from "fs-extra";

const testUpmAuth: TokenAuth = {
  email: "test@mail.com",
  token: "ThisIsNotAValidToken",
};

const testNpmAuth: NpmAuth = {
  token: "ThisIsNotAValidToken",
  alwaysAuth: false,
};

const testUpmConfig: UPMConfig = {
  npmAuth: { [registryUrl("http://registry.npmjs.org")]: testUpmAuth },
};

describe("env", function () {
  describe("parseEnv", function () {
    let mockConsole: MockConsole = null!;
    let mockProject: MockUnityProject = null!;

    beforeAll(async function () {
      mockProject = await setupUnityProject({
        version: "2019.2.13f1",
        upmConfig: testUpmConfig,
      });
    });

    beforeEach(function () {
      mockConsole = attachMockConsole();
    });

    afterEach(async function () {
      mockConsole.detach();
      await mockProject.reset();
    });

    afterAll(async function () {
      await mockProject.restore();
    });

    it("defaults", async function () {
      const env = await parseEnv({ _global: {} }, false);
      should(env).not.be.null();
      env!.registry.url.should.equal("https://package.openupm.com");
      env!.upstream.should.be.ok();
      env!.upstreamRegistry.url.should.equal("https://packages.unity.com");
      env!.cwd.should.equal("");
      (env!.editorVersion === null).should.be.ok();
    });

    it("check path", async function () {
      const env = await parseEnv({ _global: {} }, true);
      should(env).not.be.null();
      env!.cwd.should.be.equal(mockProject.projectPath);
    });
    it("can not resolve path", async function () {
      const env = await parseEnv(
        { _global: { chdir: "/path-not-exist" } },
        true
      );
      should(env).be.null();
      expect(mockConsole).toHaveLineIncluding("out", "can not resolve path");
    });

    it("can not locate manifest.json", async function () {
      // Delete manifest
      const manifestPath = manifestPathFor(mockProject.projectPath);
      fse.rmSync(manifestPath);

      const env = await parseEnv({ _global: {} }, true);
      should(env).be.null();
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "can not locate manifest.json"
      );
    });
    it("custom registry", async function () {
      const env = await parseEnv(
        { _global: { registry: "https://registry.npmjs.org" } },
        false
      );
      should(env).not.be.null();
      env!.registry.url.should.be.equal("https://registry.npmjs.org");
    });
    it("custom registry with splash", async function () {
      const env = await parseEnv(
        { _global: { registry: "https://registry.npmjs.org/" } },
        false
      );
      should(env).not.be.null();
      env!.registry.url.should.be.equal("https://registry.npmjs.org");
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
      env!.registry.url.should.be.equal("https://registry.npmjs.org/some");
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
      env!.registry.url.should.be.equal("https://registry.npmjs.org/some");
    });
    it("custom registry without http", async function () {
      const env = await parseEnv(
        { _global: { registry: "registry.npmjs.org" } },
        false
      );
      should(env).not.be.null();
      env!.registry.url.should.be.equal("http://registry.npmjs.org");
    });
    it("custom registry with ipv4+port", async function () {
      const env = await parseEnv(
        { _global: { registry: "http://127.0.0.1:4873" } },
        false
      );
      should(env).not.be.null();
      env!.registry.url.should.be.equal("http://127.0.0.1:4873");
    });
    it("custom registry with ipv6+port", async function () {
      const env = await parseEnv(
        {
          _global: { registry: "http://[1:2:3:4:5:6:7:8]:4873" },
        },
        false
      );
      should(env).not.be.null();
      env!.registry.url.should.be.equal("http://[1:2:3:4:5:6:7:8]:4873");
    });
    it("should have registry auth if specified", async function () {
      const env = await parseEnv(
        {
          _global: {
            registry: "registry.npmjs.org",
          },
        },
        true
      );
      should(env).not.be.null();
      should(env!.registry.auth).deepEqual(testNpmAuth);
    });
    it("should not have unspecified registry auth", async function () {
      const env = await parseEnv(
        {
          _global: {
            registry: "registry.other.org",
          },
        },
        true
      );
      should(env).not.be.null();
      should(env!.registry.auth).be.null();
    });
    it("upstream", async function () {
      const env = await parseEnv({ _global: { upstream: false } }, false);
      should(env).not.be.null();
      env!.upstream.should.not.be.ok();
    });
    it("editorVersion", async function () {
      const env = await parseEnv({ _global: {} }, true);
      should(env).not.be.null();
      should(env!.editorVersion).be.equal("2019.2.13f1");
    });
    it("region cn", async function () {
      const env = await parseEnv({ _global: { cn: true } }, false);
      should(env).not.be.null();
      env!.registry.url.should.be.equal("https://package.openupm.cn");
      env!.upstreamRegistry.url.should.be.equal("https://packages.unity.cn");
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
      env!.registry.url.should.be.equal("https://reg.custom-package.com");
      env!.upstreamRegistry.url.should.be.equal("https://packages.unity.cn");
    });
  });
});
