import { TokenAuth, UPMConfig } from "../../src/domain/upm-config";
import { NpmAuth } from "another-npm-registry-client";
import { Env, makeParseEnvService } from "../../src/services/parse-env";
import log from "../../src/cli/logger";
import { tryLoadProjectVersion } from "../../src/io/project-version-io";
import { Err, Ok } from "ts-results-es";
import { tryGetUpmConfigDir } from "../../src/io/upm-config-io";
import fs from "fs";
import { IOError, NotFoundError } from "../../src/io/file-io";
import { FileParseError } from "../../src/common-errors";
import { makeEditorVersion } from "../../src/domain/editor-version";
import { NoWslError } from "../../src/io/wsl";
import { mockUpmConfig } from "../io/upm-config-io.mock";
import { mockProjectVersion } from "../io/project-version-io.mock";
import { exampleRegistryUrl } from "../domain/data-registry";
import { spyOnLog } from "../cli/log.mock";

jest.mock("../../src/io/project-version-io");
jest.mock("../../src/io/upm-config-io");
jest.mock("fs");
jest.spyOn(process, "cwd");

const testRootPath = "/users/some-user/projects/MyUnityProject";

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

const testProjectVersion = "2021.3.1f1";

function makeDependencies() {
  const parseEnv = makeParseEnvService();

  return { parseEnv } as const;
}

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
    mockUpmConfig(null);

    // The project has a ProjectVersion.txt
    mockProjectVersion(testProjectVersion);
  });

  describe("log-level", () => {
    it("should be verbose if verbose option is true", async () => {
      const { parseEnv } = makeDependencies();

      await parseEnv({
        _global: {
          verbose: true,
        },
      });

      expect(log.level).toEqual("verbose");
    });

    it("should be notice if verbose option is false", async () => {
      const { parseEnv } = makeDependencies();

      await parseEnv({
        _global: {
          verbose: false,
        },
      });

      expect(log.level).toEqual("notice");
    });

    it("should be notice if verbose option is missing", async () => {
      const { parseEnv } = makeDependencies();

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
      const { parseEnv } = makeDependencies();
      const colorDisableSpy = jest.spyOn(log, "disableColor");

      await parseEnv({
        _global: {
          color: true,
        },
      });

      expect(colorDisableSpy).not.toHaveBeenCalled();
    });

    it("should use color if color option is missing", async () => {
      const { parseEnv } = makeDependencies();
      const colorDisableSpy = jest.spyOn(log, "disableColor");

      await parseEnv({
        _global: {},
      });

      expect(colorDisableSpy).not.toHaveBeenCalled();
    });

    it("should not use color if color option is false", async () => {
      const { parseEnv } = makeDependencies();
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
      const { parseEnv } = makeDependencies();

      const result = await parseEnv({
        _global: {
          upstream: true,
        },
      });

      expect(result).toBeOk((env: Env) => expect(env.upstream).toBeTruthy());
    });

    it("should use upstream if upstream option is missing", async () => {
      const { parseEnv } = makeDependencies();

      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) => expect(env.upstream).toBeTruthy());
    });

    it("should not use upstream if upstream option is false", async () => {
      const { parseEnv } = makeDependencies();

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
      const { parseEnv } = makeDependencies();
      const logSpy = jest.spyOn(log, "notice");

      await parseEnv({
        _global: {
          cn: true,
        },
      });

      expect(logSpy).toHaveBeenCalledWith("region", "cn");
    });

    it("should not notify of china region if cn option is missing", async () => {
      const { parseEnv } = makeDependencies();
      const logSpy = jest.spyOn(log, "notice");

      await parseEnv({
        _global: {},
      });

      expect(logSpy).not.toHaveBeenCalledWith("region", "cn");
    });

    it("should not notify of china region if cn option is false", async () => {
      const { parseEnv } = makeDependencies();
      const logSpy = jest.spyOn(log, "notice");

      await parseEnv({
        _global: { cn: false },
      });

      expect(logSpy).not.toHaveBeenCalledWith("region", "cn");
    });
  });

  describe("system-user", () => {
    it("should be system-user if option is true", async () => {
      const { parseEnv } = makeDependencies();

      const result = await parseEnv({
        _global: {
          systemUser: true,
        },
      });

      expect(result).toBeOk((env: Env) => expect(env.systemUser).toBeTruthy());
    });

    it("should not be system-user if option is missing", async () => {
      const { parseEnv } = makeDependencies();

      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) => expect(env.systemUser).toBeFalsy());
    });

    it("should not be system-user if option is false", async () => {
      const { parseEnv } = makeDependencies();

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
      const { parseEnv } = makeDependencies();

      const result = await parseEnv({
        _global: {
          wsl: true,
        },
      });

      expect(result).toBeOk((env: Env) => expect(env.wsl).toBeTruthy());
    });

    it("should not use wsl if option is missing", async () => {
      const { parseEnv } = makeDependencies();

      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) => expect(env.wsl).toBeFalsy());
    });

    it("should not use wsl if option is false", async () => {
      const { parseEnv } = makeDependencies();

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
      const { parseEnv } = makeDependencies();
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
      const { parseEnv } = makeDependencies();

      const result = await parseEnv({ _global: {} });

      expect(result).toBeOk((env: Env) =>
        expect(env.registry.url).toEqual("https://package.openupm.com")
      );
    });

    it("should be chinese openupm for chinese locale", async () => {
      const { parseEnv } = makeDependencies();

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
      const { parseEnv } = makeDependencies();

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
      const { parseEnv } = makeDependencies();

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
      const { parseEnv } = makeDependencies();
      mockUpmConfig({
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

    it("should notify if upm-config did not have auth", async () => {
      const { parseEnv } = makeDependencies();
      const warnSpy = spyOnLog("warn");
      mockUpmConfig({
        npmAuth: {},
      });

      await parseEnv({
        _global: {
          registry: exampleRegistryUrl,
        },
      });

      expect(warnSpy).toHaveLogLike(
        "env.auth",
        expect.stringContaining("failed to parse auth info")
      );
    });

    it("should have auth if upm-config had entry for the url", async () => {
      const { parseEnv } = makeDependencies();
      mockUpmConfig(testUpmConfig);

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
      const { parseEnv } = makeDependencies();

      const result = await parseEnv({ _global: {} });

      expect(result).toBeOk((env: Env) =>
        expect(env.upstreamRegistry.url).toEqual("https://packages.unity.com")
      );
    });

    it("should be chinese unity for chinese locale", async () => {
      const { parseEnv } = makeDependencies();

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
      const { parseEnv } = makeDependencies();

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
      const { parseEnv } = makeDependencies();

      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.cwd).toEqual(testRootPath)
      );
    });

    it("should be specified path if overridden", async () => {
      const { parseEnv } = makeDependencies();

      const expected = "/some/other/path";

      const result = await parseEnv({
        _global: {
          chdir: expected,
        },
      });

      expect(result).toBeOk((env: Env) => expect(env.cwd).toEqual(expected));
    });
  });

  describe("editor-version", () => {
    it("should be parsed object for valid release versions", async () => {
      const { parseEnv } = makeDependencies();

      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.editorVersion).toEqual(makeEditorVersion(2021, 3, 1, "f", 1))
      );
    });

    it("should be original string for non-release versions", async () => {
      const { parseEnv } = makeDependencies();
      const expected = "2022.3";
      mockProjectVersion(expected);

      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.editorVersion).toEqual(expected)
      );
    });

    it("should be original string for non-version string", async () => {
      const { parseEnv } = makeDependencies();
      const expected = "Bad version";
      mockProjectVersion(expected);

      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeOk((env: Env) =>
        expect(env.editorVersion).toEqual(expected)
      );
    });

    it("should fail if ProjectVersion.txt could not be loaded", async () => {
      const { parseEnv } = makeDependencies();
      const expected = new IOError();
      jest
        .mocked(tryLoadProjectVersion)
        .mockReturnValue(Err(expected).toAsyncResult());

      const result = await parseEnv({
        _global: {},
      });

      expect(result).toBeError((error) => expect(error).toEqual(expected));
    });

    it("should notify of missing ProjectVersion.txt", async () => {
      const { parseEnv } = makeDependencies();
      jest
        .mocked(tryLoadProjectVersion)
        .mockReturnValue(
          Err(
            new NotFoundError("/some/path/ProjectVersion.txt")
          ).toAsyncResult()
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
      const { parseEnv } = makeDependencies();
      jest
        .mocked(tryLoadProjectVersion)
        .mockReturnValue(
          Err(
            new FileParseError(
              "/some/path/ProjectVersion.txt",
              "ProjectVersion.txt"
            )
          ).toAsyncResult()
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
