import { emptyUpmConfig, UPMConfig } from "../../src/domain/upm-config";
import { NpmAuth } from "another-npm-registry-client";
import { makeParseEnv } from "../../src/services/parse-env";
import { GetUpmConfigPath } from "../../src/io/upm-config-io";
import { exampleRegistryUrl } from "../domain/data-registry";
import { makeMockLogger } from "../cli/log.mock";
import { mockService } from "./service.mock";
import { GetCwd } from "../../src/io/special-paths";
import path from "path";
import { noopLogger } from "../../src/logging";
import { LoadRegistryAuth } from "../../src/services/load-registry-auth";

const testRootPath = "/users/some-user/projects/MyUnityProject";

const testNpmAuth: NpmAuth = {
  token: "ThisIsNotAValidToken",
  alwaysAuth: false,
};

const testUpmConfig: UPMConfig = {
  [exampleRegistryUrl]: testNpmAuth,
};

function makeDependencies() {
  const log = makeMockLogger();

  const getUpmConfigPath = mockService<GetUpmConfigPath>();
  // The root directory does not contain an upm-config
  getUpmConfigPath.mockResolvedValue(testRootPath);

  const loadRegistryAuth = mockService<LoadRegistryAuth>();
  loadRegistryAuth.mockResolvedValue(emptyUpmConfig);

  // process.cwd is in the root directory.
  const getCwd = mockService<GetCwd>();
  getCwd.mockReturnValue(testRootPath);

  const parseEnv = makeParseEnv(
    log,
    getUpmConfigPath,
    loadRegistryAuth,
    getCwd,
    noopLogger
  );
  return {
    parseEnv,
    log,
    getUpmConfigPath,
    loadRegistryAuth,
  } as const;
}

describe("env", () => {
  describe("log-level", () => {
    it("should be verbose if verbose option is true", async () => {
      const { parseEnv, log } = makeDependencies();

      await parseEnv({
        _global: {
          verbose: true,
        },
      });

      expect(log.level).toEqual("verbose");
    });

    it("should be notice if verbose option is false", async () => {
      const { parseEnv, log } = makeDependencies();

      await parseEnv({
        _global: {
          verbose: false,
        },
      });

      expect(log.level).toEqual("notice");
    });

    it("should be notice if verbose option is missing", async () => {
      const { parseEnv, log } = makeDependencies();

      await parseEnv({
        _global: {
          verbose: false,
        },
      });

      expect(log.level).toEqual("notice");
    });
  });

  describe("color", () => {
    beforeEach(() => {
      process.env["NODE_ENV"] = undefined;
    });

    it("should use color if color option is true", async () => {
      const { parseEnv, log } = makeDependencies();

      await parseEnv({
        _global: {
          color: true,
        },
      });

      expect(log.disableColor).not.toHaveBeenCalled();
    });

    it("should use color if color option is missing", async () => {
      const { parseEnv, log } = makeDependencies();

      await parseEnv({
        _global: {},
      });

      expect(log.disableColor).not.toHaveBeenCalled();
    });

    it("should not use color if color option is false", async () => {
      const { parseEnv, log } = makeDependencies();

      await parseEnv({
        _global: {
          color: false,
        },
      });

      expect(log.disableColor).toHaveBeenCalled();
    });
  });

  describe("use upstream", () => {
    it("should use upstream if upstream option is true", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {
          upstream: true,
        },
      });

      expect(env.upstream).toBeTruthy();
    });

    it("should use upstream if upstream option is missing", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {},
      });

      expect(env.upstream).toBeTruthy();
    });

    it("should not use upstream if upstream option is false", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {
          upstream: false,
        },
      });

      expect(env.upstream).toBeFalsy();
    });
  });

  describe("system-user", () => {
    it("should be system-user if option is true", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {
          systemUser: true,
        },
      });

      expect(env.systemUser).toBeTruthy();
    });

    it("should not be system-user if option is missing", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {},
      });

      expect(env.systemUser).toBeFalsy();
    });

    it("should not be system-user if option is false", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {
          systemUser: false,
        },
      });

      expect(env.systemUser).toBeFalsy();
    });
  });

  describe("wsl", () => {
    it("should use wsl if option is true", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {
          wsl: true,
        },
      });

      expect(env.wsl).toBeTruthy();
    });

    it("should not use wsl if option is missing", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {},
      });

      expect(env.wsl).toBeFalsy();
    });

    it("should not use wsl if option is false", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {
          wsl: false,
        },
      });

      expect(env.wsl).toBeFalsy();
    });
  });

  describe("registry", () => {
    it("should be global openupm by default", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({ _global: {} });

      expect(env.registry.url).toEqual("https://package.openupm.com");
    });

    it("should be custom registry if overridden", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {
          registry: exampleRegistryUrl,
        },
      });

      expect(env.registry.url).toEqual(exampleRegistryUrl);
    });

    it("should have no auth if no upm-config was found", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {
          registry: exampleRegistryUrl,
        },
      });

      expect(env.registry.auth).toEqual(null);
    });

    it("should have no auth if upm-config had no entry for the url", async () => {
      const { parseEnv, loadRegistryAuth } = makeDependencies();
      loadRegistryAuth.mockResolvedValue({});

      const env = await parseEnv({
        _global: {
          registry: exampleRegistryUrl,
        },
      });

      expect(env.registry.auth).toEqual(null);
    });

    it("should notify if upm-config did not have auth", async () => {
      const { parseEnv, log, loadRegistryAuth } = makeDependencies();
      loadRegistryAuth.mockResolvedValue({});

      await parseEnv({
        _global: {
          registry: exampleRegistryUrl,
        },
      });

      expect(log.warn).toHaveBeenCalledWith(
        "env.auth",
        expect.stringContaining("failed to parse auth info")
      );
    });

    it("should have auth if upm-config had entry for the url", async () => {
      const { parseEnv, loadRegistryAuth } = makeDependencies();
      loadRegistryAuth.mockResolvedValue(testUpmConfig);

      const env = await parseEnv({
        _global: {
          registry: exampleRegistryUrl,
        },
      });

      expect(env.registry.auth).toEqual(testNpmAuth);
    });
  });

  describe("upstream registry", () => {
    it("should be global unity by default", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({ _global: {} });

      expect(env.upstreamRegistry.url).toEqual("https://packages.unity.com");
    });

    it("should have no auth", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {},
      });

      expect(env.upstreamRegistry.auth).toEqual(null);
    });
  });

  describe("cwd", () => {
    it("should be process directory by default", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        _global: {},
      });

      expect(env.cwd).toEqual(testRootPath);
    });

    it("should be specified path if overridden", async () => {
      const { parseEnv } = makeDependencies();

      const expected = path.resolve("/some/other/path");

      const env = await parseEnv({
        _global: {
          chdir: expected,
        },
      });

      expect(env.cwd).toEqual(expected);
    });
  });
});
