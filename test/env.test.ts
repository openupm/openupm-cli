import { parseEnv } from "../src/utils/env";
import { attachMockConsole, MockConsole } from "./mock-console";
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
      const env = (await parseEnv({ _global: {} }, false)).unwrap();
      expect(env.registry.url).toEqual("https://package.openupm.com");
      expect(env.upstream).toBeTruthy();
      expect(env.upstreamRegistry.url).toEqual("https://packages.unity.com");
      expect(env.cwd).toEqual("");
      expect(env.editorVersion === null).toBeTruthy();
    });

    it("check path", async function () {
      const env = (await parseEnv({ _global: {} }, true)).unwrap();
      expect(env.cwd).toEqual(mockProject.projectPath);
    });
    it("can not resolve path", async function () {
      const envResult = await parseEnv(
        { _global: { chdir: "/path-not-exist" } },
        true
      );
      expect(envResult.isOk).toBeFalsy();
      expect(mockConsole).toHaveLineIncluding("out", "can not resolve path");
    });

    it("can not locate manifest.json", async function () {
      // Delete manifest
      const manifestPath = manifestPathFor(mockProject.projectPath);
      fse.rmSync(manifestPath);

      const envResult = await parseEnv({ _global: {} }, true);
      expect(envResult.isOk).toBeFalsy();
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "can not locate manifest.json"
      );
    });
    it("custom registry", async function () {
      const env = (
        await parseEnv(
          { _global: { registry: "https://registry.npmjs.org" } },
          false
        )
      ).unwrap();

      expect(env.registry.url).toEqual("https://registry.npmjs.org");
    });
    it("custom registry with splash", async function () {
      const env = (
        await parseEnv(
          { _global: { registry: "https://registry.npmjs.org/" } },
          false
        )
      ).unwrap();

      expect(env.registry.url).toEqual("https://registry.npmjs.org");
    });
    it("custom registry with extra path", async function () {
      const env = (
        await parseEnv(
          {
            _global: {
              registry: "https://registry.npmjs.org/some",
            },
          },
          false
        )
      ).unwrap();

      expect(env.registry.url).toEqual("https://registry.npmjs.org/some");
    });
    it("custom registry with extra path and splash", async function () {
      const env = (
        await parseEnv(
          {
            _global: {
              registry: "https://registry.npmjs.org/some/",
            },
          },
          false
        )
      ).unwrap();

      expect(env.registry.url).toEqual("https://registry.npmjs.org/some");
    });
    it("custom registry without http", async function () {
      const env = (
        await parseEnv({ _global: { registry: "registry.npmjs.org" } }, false)
      ).unwrap();

      expect(env.registry.url).toEqual("http://registry.npmjs.org");
    });
    it("custom registry with ipv4+port", async function () {
      const env = (
        await parseEnv(
          { _global: { registry: "http://127.0.0.1:4873" } },
          false
        )
      ).unwrap();

      expect(env.registry.url).toEqual("http://127.0.0.1:4873");
    });
    it("custom registry with ipv6+port", async function () {
      const env = (
        await parseEnv(
          {
            _global: { registry: "http://[1:2:3:4:5:6:7:8]:4873" },
          },
          false
        )
      ).unwrap();

      expect(env.registry.url).toEqual("http://[1:2:3:4:5:6:7:8]:4873");
    });
    it("should have registry auth if specified", async function () {
      const env = (
        await parseEnv(
          {
            _global: {
              registry: "registry.npmjs.org",
            },
          },
          true
        )
      ).unwrap();

      expect(env.registry.auth).toEqual(testNpmAuth);
    });
    it("should not have unspecified registry auth", async function () {
      const env = (
        await parseEnv(
          {
            _global: {
              registry: "registry.other.org",
            },
          },
          true
        )
      ).unwrap();

      expect(env.registry.auth).toBeNull();
    });
    it("upstream", async function () {
      const env = (
        await parseEnv({ _global: { upstream: false } }, false)
      ).unwrap();

      expect(env.upstream).not.toBeTruthy();
    });
    it("editorVersion", async function () {
      const env = (await parseEnv({ _global: {} }, true)).unwrap();

      expect(env.editorVersion).toEqual("2019.2.13f1");
    });
    it("region cn", async function () {
      const env = (await parseEnv({ _global: { cn: true } }, false)).unwrap();

      expect(env.registry.url).toEqual("https://package.openupm.cn");
      expect(env.upstreamRegistry.url).toEqual("https://packages.unity.cn");
    });
    it("region cn with a custom registry", async function () {
      const env = (
        await parseEnv(
          {
            _global: {
              cn: true,
              registry: "https://reg.custom-package.com",
            },
          },
          false
        )
      ).unwrap();

      expect(env.registry.url).toEqual("https://reg.custom-package.com");
      expect(env.upstreamRegistry.url).toEqual("https://packages.unity.cn");
    });
  });
});
