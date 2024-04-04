import { TokenAuth, UPMConfig } from "../src/domain/upm-config";
import { NpmAuth } from "another-npm-registry-client";
import { Env, parseEnv } from "../src/utils/env";
import log from "../src/cli/logger";
import { tryLoadProjectVersion } from "../src/io/project-version-io";
import { Err, Ok } from "ts-results-es";
import {
  NoWslError,
  tryGetUpmConfigDir,
  tryLoadUpmConfig,
} from "../src/io/upm-config-io";
import { testRootPath } from "./setup/unity-project";
import { exampleRegistryUrl } from "./mock-registry";
import fs from "fs";
import { NotFoundError } from "../src/io/file-io";
import { FileParseError, IOError } from "../src/common-errors";

jest.mock("../src/io/project-version-io");
jest.mock("../src/io/upm-config-io");
jest.mock("fs");
jest.spyOn(process, "cwd");

const testUpmAuth: TokenAuth = {
  email: "test@mail.com",
  token: "ThisIsNotAValidToken",
};

const testNpmAuth: NpmAuth = {
  token: "ThisIsNotAValidToken",
  alwaysAuth: false,
};

const testUpmConfig: UPMConfig = {
  npmAuth: { [exampleRegistryUrl]: testUpmAuth },
};

const testProjectVersion = "2021.3";

describe("env", () => {
  beforeEach(() => {
    // By default, we simulate the following:

    // The following directories exist
    jest.mocked(fs.existsSync).mockReturnValue(true);

    // process.cwd is in the root directory.
    jest.mocked(process.cwd).mockReturnValue(testRootPath);

    // The root directory does not contain an upm-config
    jest
      .mocked(tryGetUpmConfigDir)
      .mockReturnValue(Ok(testRootPath).toAsyncResult());
    jest.mocked(tryLoadUpmConfig).mockResolvedValue(null);

    // The project has a ProjectVersion.txt
    jest
      .mocked(tryLoadProjectVersion)
      .mockResolvedValue(Ok(testProjectVersion));
  });

  describe("log-level", () => {
    it("should be verbose if verbose option is true", async () => {
      await parseEnv({
        _global: {
          verbose: true,
        },
      });

      expect(log.level).toEqual("verbose");
    });

    it("should be notice if verbose option is false", async () => {
      await parseEnv({
        _global: {
          verbose: false,
        },
      });

      expect(log.level).toEqual("notice");
    });

    it("should be notice if verbose option is missing", async () => {
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
      const colorDisableSpy = jest.spyOn(log, "disableColor");

      await parseEnv({
        _global: {
          color: true,
        },
      });

      expect(colorDisableSpy).not.toHaveBeenCalled();
    });

    it("should use color if color option is missing", async () => {
      const colorDisableSpy = jest.spyOn(log, "disableColor");

      await parseEnv({
        _global: {},
      });

      expect(colorDisableSpy).not.toHaveBeenCalled();
    });

    it("should not use color if color option is false", async () => {
      const colorDisableSpy = jest.spyOn(log, "disableColor");

      await parseEnv({
        _global: {
          color: false,
        },
      });

      expect(colorDisableSpy).toHaveBeenCalled();
    });
  });

  describe("use upstream", () => {
    it("should use upstream if upstream option is true", async () => {
      const result = await parseEnv({
        _global: {
          upstream: true,
        },
      });

      expect(result).toBeOk((env: Env) => expect(env.upstream).toBeTruthy());
    });

    it("should use upstream if upstream option is missing", async () => {
      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) => expect(env.upstream).toBeTruthy());
    });

    it("should not use upstream if upstream option is false", async () => {
      const result = await parseEnv({
        _global: {
          upstream: false,
        },
      });

      expect(result).toBeOk((env: Env) => expect(env.upstream).toBeFalsy());
    });
  });

  describe("region log", () => {
    it("should notify of china region if cn option is true", async () => {
      const logSpy = jest.spyOn(log, "notice");

      await parseEnv({
        _global: {
          cn: true,
        },
      });

      expect(logSpy).toHaveBeenCalledWith("region", "cn");
    });

    it("should not notify of china region if cn option is missing", async () => {
      const logSpy = jest.spyOn(log, "notice");

      await parseEnv({
        _global: {},
      });

      expect(logSpy).not.toHaveBeenCalledWith("region", "cn");
    });

    it("should not notify of china region if cn option is false", async () => {
      const logSpy = jest.spyOn(log, "notice");

      await parseEnv({
        _global: { cn: false },
      });

      expect(logSpy).not.toHaveBeenCalledWith("region", "cn");
    });
  });

  describe("system-user", () => {
    it("should be system-user if option is true", async () => {
      const result = await parseEnv({
        _global: {
          systemUser: true,
        },
      });

      expect(result).toBeOk((env: Env) => expect(env.systemUser).toBeTruthy());
    });

    it("should not be system-user if option is missing", async () => {
      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) => expect(env.systemUser).toBeFalsy());
    });

    it("should not be system-user if option is false", async () => {
      const result = await parseEnv({
        _global: {
          systemUser: false,
        },
      });

      expect(result).toBeOk((env: Env) => expect(env.systemUser).toBeFalsy());
    });
  });

  describe("wsl", () => {
    it("should use wsl if option is true", async () => {
      const result = await parseEnv({
        _global: {
          wsl: true,
        },
      });

      expect(result).toBeOk((env: Env) => expect(env.wsl).toBeTruthy());
    });

    it("should not use wsl if option is missing", async () => {
      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) => expect(env.wsl).toBeFalsy());
    });

    it("should not use wsl if option is false", async () => {
      const result = await parseEnv({
        _global: {
          wsl: false,
        },
      });

      expect(result).toBeOk((env: Env) => expect(env.wsl).toBeFalsy());
    });
  });

  describe("upm-config", () => {
    it("should fail if upm-config dir cannot be determined", async () => {
      const expected = new NoWslError();
      jest
        .mocked(tryGetUpmConfigDir)
        .mockReturnValue(Err(expected).toAsyncResult());

      const result = await parseEnv({ _global: {} });

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });
  });

  describe("registry", () => {
    it("should be global openupm by default", async () => {
      const result = await parseEnv({ _global: {} });

      expect(result).toBeOk((env: Env) =>
        expect(env.registry.url).toEqual("https://package.openupm.com")
      );
    });

    it("should be chinese openupm for chinese locale", async () => {
      const result = await parseEnv({
        _global: {
          cn: true,
        },
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.registry.url).toEqual("https://package.openupm.cn")
      );
    });

    it("should be custom registry if overridden", async () => {
      const result = await parseEnv({
        _global: {
          registry: exampleRegistryUrl,
        },
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.registry.url).toEqual(exampleRegistryUrl)
      );
    });

    it("should have no auth if no upm-config was found", async () => {
      const result = await parseEnv({
        _global: {
          registry: exampleRegistryUrl,
        },
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.registry.auth).toEqual(null)
      );
    });

    it("should have no auth if upm-config had no entry for the url", async () => {
      jest.mocked(tryLoadUpmConfig).mockResolvedValue({
        npmAuth: {},
      });

      const result = await parseEnv({
        _global: {
          registry: exampleRegistryUrl,
        },
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.registry.auth).toEqual(null)
      );
    });

    it("should have auth if upm-config had entry for the url", async () => {
      jest.mocked(tryLoadUpmConfig).mockResolvedValue(testUpmConfig);

      const result = await parseEnv({
        _global: {
          registry: exampleRegistryUrl,
        },
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.registry.auth).toEqual(testNpmAuth)
      );
    });
  });

  describe("upstream registry", () => {
    it("should be global unity by default", async () => {
      const result = await parseEnv({ _global: {} });

      expect(result).toBeOk((env: Env) =>
        expect(env.upstreamRegistry.url).toEqual("https://packages.unity.com")
      );
    });

    it("should be chinese unity for chinese locale", async () => {
      const result = await parseEnv({
        _global: {
          cn: true,
        },
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.upstreamRegistry.url).toEqual("https://packages.unity.cn")
      );
    });

    it("should have no auth", async () => {
      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.upstreamRegistry.auth).toEqual(null)
      );
    });
  });

  describe("cwd", () => {
    it("should be process directory by default", async () => {
      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.cwd).toEqual(testRootPath)
      );
    });

    it("should be specified path if overridden", async () => {
      const expected = "/some/other/path";

      const result = await parseEnv({
        _global: {
          chdir: expected,
        },
      });

      expect(result).toBeOk((env: Env) => expect(env.cwd).toEqual(expected));
    });

    it("should fail if specified path is not found", async () => {
      const notExistentPath = "/some/other/path";
      jest
        .mocked(fs.existsSync)
        .mockImplementation((path) => path !== notExistentPath);

      const result = await parseEnv({
        _global: {
          chdir: notExistentPath,
        },
      });

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(NotFoundError)
      );
    });

    it("should notify if specified path is not found", async () => {
      const notExistentPath = "/some/other/path";
      jest
        .mocked(fs.existsSync)
        .mockImplementation((path) => path !== notExistentPath);
      const logSpy = jest.spyOn(log, "error");

      await parseEnv({
        _global: {
          chdir: notExistentPath,
        },
      });

      expect(logSpy).toHaveBeenCalledWith(
        "env",
        expect.stringContaining("can not resolve")
      );
    });
  });

  describe("project-version", () => {
    it("should use version from ProjectVersion.txt", async () => {
      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.editorVersion).toEqual(testProjectVersion)
      );
    });

    it("should fail if ProjectVersion.txt could not be loaded", async () => {
      const expected = new IOError();
      jest.mocked(tryLoadProjectVersion).mockResolvedValue(Err(expected));

      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeError((error) => expect(error).toEqual(expected));
    });

    it("should notify of missing ProjectVersion.txt", async () => {
      jest
        .mocked(tryLoadProjectVersion)
        .mockResolvedValue(
          Err(new NotFoundError("/some/path/ProjectVersion.txt"))
        );
      const logSpy = jest.spyOn(log, "warn");

      await parseEnv({
        _global: {},
      });

      expect(logSpy).toHaveBeenCalledWith(
        "ProjectVersion",
        expect.stringContaining("can not locate")
      );
    });

    it("should notify of parsing issue", async () => {
      jest
        .mocked(tryLoadProjectVersion)
        .mockResolvedValue(
          Err(
            new FileParseError(
              "/some/path/ProjectVersion.txt",
              "ProjectVersion.txt"
            )
          )
        );
      const logSpy = jest.spyOn(log, "error");

      await parseEnv({
        _global: {},
      });

      expect(logSpy).toHaveBeenCalledWith(
        "ProjectVersion",
        expect.stringContaining("could not be parsed")
      );
    });
  });
});
