import path from "path";
import { makeParseEnv } from "../../../src/cli/parse-env";
import { openupmRegistryUrl } from "../../../src/domain/registry-url";
import { makeMockLogger } from "../../common/log.mock";
import { exampleRegistryUrl } from "../../common/data-registry";

const testRootPath = "/users/some-user/projects/MyUnityProject";

function makeDependencies() {
  const log = makeMockLogger();

  const parseEnv = makeParseEnv(log, testRootPath);
  return { parseEnv, log } as const;
}

describe("env", () => {
  describe("log-level", () => {
    it("should be verbose if verbose option is true", async () => {
      const { parseEnv, log } = makeDependencies();

      await parseEnv({
        verbose: true,
      });

      expect(log.level).toEqual("verbose");
    });

    it("should be notice if verbose option is false", async () => {
      const { parseEnv, log } = makeDependencies();

      await parseEnv({
        verbose: false,
      });

      expect(log.level).toEqual("notice");
    });

    it("should be notice if verbose option is missing", async () => {
      const { parseEnv, log } = makeDependencies();

      await parseEnv({
        verbose: false,
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
        color: true,
      });

      expect(log.disableColor).not.toHaveBeenCalled();
    });

    it("should use color if color option is missing", async () => {
      const { parseEnv, log } = makeDependencies();

      await parseEnv({});

      expect(log.disableColor).not.toHaveBeenCalled();
    });

    it("should not use color if color option is false", async () => {
      const { parseEnv, log } = makeDependencies();

      await parseEnv({
        color: false,
      });

      expect(log.disableColor).toHaveBeenCalled();
    });
  });

  describe("use upstream", () => {
    it("should use upstream if upstream option is true", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        upstream: true,
      });

      expect(env.upstream).toBeTruthy();
    });

    it("should use upstream if upstream option is missing", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({});

      expect(env.upstream).toBeTruthy();
    });

    it("should not use upstream if upstream option is false", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        upstream: false,
      });

      expect(env.upstream).toBeFalsy();
    });
  });

  describe("system-user", () => {
    it("should be system-user if option is true", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        systemUser: true,
      });

      expect(env.systemUser).toBeTruthy();
    });

    it("should not be system-user if option is missing", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({});

      expect(env.systemUser).toBeFalsy();
    });

    it("should not be system-user if option is false", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        systemUser: false,
      });

      expect(env.systemUser).toBeFalsy();
    });
  });

  describe("registry", () => {
    it("should be openupm by default", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({});

      expect(env.primaryRegistryUrl).toEqual(openupmRegistryUrl);
    });

    it("should be custom registry url if overridden", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({
        registry: exampleRegistryUrl,
      });

      expect(env.primaryRegistryUrl).toEqual(exampleRegistryUrl);
    });
  });

  describe("cwd", () => {
    it("should be process directory by default", async () => {
      const { parseEnv } = makeDependencies();

      const env = await parseEnv({});

      expect(env.cwd).toEqual(testRootPath);
    });

    it("should be specified path if overridden", async () => {
      const { parseEnv } = makeDependencies();

      const expected = path.resolve("/some/other/path");

      const env = await parseEnv({
        chdir: expected,
      });

      expect(env.cwd).toEqual(expected);
    });
  });
});
