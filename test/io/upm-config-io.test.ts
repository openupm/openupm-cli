import {
  makeGetUpmConfigPath,
  makeLoadUpmConfig,
  makePutUpmAuth,
} from "../../src/io/upm-config-io";
import { ReadTextFile, WriteTextFile } from "../../src/io/text-file-io";
import { mockService } from "../services/service.mock";
import { GetHomePath } from "../../src/io/special-paths";
import path from "path";
import { RunChildProcess } from "../../src/io/child-process";
import { EOL } from "node:os";
import { exampleRegistryUrl } from "../domain/data-registry";

describe("upm-config-io", () => {
  const someConfigPath = "/home/user/.upmconfig.toml";
  const someEmail = "user@mail.com";
  const someToken = "isehusehgusheguszg8gshg";
  const otherToken = "iuzsegsjfousehgosejgha";

  describe("get path", () => {
    function makeDependencies() {
      const getHomePath = mockService<GetHomePath>();

      const runChildProcess = mockService<RunChildProcess>();

      const getUpmConfigPath = makeGetUpmConfigPath(
        getHomePath,
        runChildProcess
      );

      return { getUpmConfigPath, getHomePath } as const;
    }

    describe("no wsl and no system-user", () => {
      it("should be in home path", async () => {
        const { getUpmConfigPath, getHomePath } = makeDependencies();
        const expected = path.resolve(someConfigPath);
        getHomePath.mockReturnValue(path.dirname(expected));

        const actual = await getUpmConfigPath(false, false);

        expect(actual).toEqual(expected);
      });
    });
  });

  function makeUpmConfigEntryToml(entry: {
    url: string;
    _auth?: string;
    email?: string;
    alwaysAuth?: boolean;
    token?: string;
  }): string {
    const lines = [`[npmAuth."${entry.url}"]`];
    if (entry._auth !== undefined) lines.push(`_auth = "${entry._auth}"`);
    if (entry.token !== undefined) lines.push(`token = "${entry.token}"`);
    if (entry.email !== undefined) lines.push(`email = "${entry.email}"`);
    if (entry.alwaysAuth !== undefined)
      lines.push(`alwaysAuth = ${entry.alwaysAuth}`);
    return lines.join(EOL) + EOL;
  }

  describe("load", () => {
    function makeDependencies() {
      const readFile = mockService<ReadTextFile>();
      readFile.mockResolvedValue("");

      const loadUpmConfig = makeLoadUpmConfig(readFile);
      return { loadUpmConfig, readFile } as const;
    }

    it("should be null if file is not found", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      readFile.mockResolvedValue(null);

      const actual = await loadUpmConfig(someConfigPath);

      expect(actual).toBeNull();
    });

    it("should load empty", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      readFile.mockResolvedValue("");

      const actual = await loadUpmConfig(someConfigPath);

      expect(actual).toEqual({});
    });

    it("should remove trailing slash on registry urls", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      readFile.mockResolvedValue(
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl + "/",
          _auth: "dXNlcjpwYXNz", // user:pass
          email: someEmail,
          alwaysAuth: true,
        })
      );

      const actual = await loadUpmConfig(someConfigPath);

      expect(actual).toEqual({
        [exampleRegistryUrl]: {
          username: "user",
          password: "pass",
          email: someEmail,
          alwaysAuth: true,
        },
      });
    });

    it("should load valid basic auth", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      readFile.mockResolvedValue(
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          _auth: "dXNlcjpwYXNz", // user:pass
          email: someEmail,
          alwaysAuth: true,
        })
      );

      const actual = await loadUpmConfig(someConfigPath);

      expect(actual).toEqual({
        [exampleRegistryUrl]: {
          username: "user",
          password: "pass",
          email: someEmail,
          alwaysAuth: true,
        },
      });
    });

    it("should load valid token auth", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      readFile.mockResolvedValue(
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          token: someToken,
          alwaysAuth: true,
        })
      );

      const actual = await loadUpmConfig(someConfigPath);

      expect(actual).toEqual({
        [exampleRegistryUrl]: {
          token: someToken,
          alwaysAuth: true,
        },
      });
    });

    it("should ignore email when loading token auth", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      readFile.mockResolvedValue(
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          token: someToken,
          email: someEmail,
        })
      );

      const actual = await loadUpmConfig(someConfigPath);

      expect(actual).toEqual({
        [exampleRegistryUrl]: {
          token: someToken,
        },
      });
    });
  });

  describe("put auth", () => {
    function makeDependencies() {
      const readFile = mockService<ReadTextFile>();
      readFile.mockResolvedValue("");

      const writeFile = mockService<WriteTextFile>();
      writeFile.mockResolvedValue();

      const putUpmAuth = makePutUpmAuth(readFile, writeFile);
      return { putUpmAuth, readFile, writeFile } as const;
    }

    it("should add entry if it does not exist", async () => {
      const { putUpmAuth, writeFile } = makeDependencies();

      await putUpmAuth(someConfigPath, exampleRegistryUrl, {
        token: someToken,
      });

      expect(writeFile).toHaveBeenCalledWith(
        someConfigPath,
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          token: someToken,
        })
      );
    });

    it("should replace entry of same type", async () => {
      const { putUpmAuth, readFile, writeFile } = makeDependencies();
      readFile.mockResolvedValue(
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          _auth: "dXNlcjpwYXNz", // user:pass
          email: "other@email.com",
        })
      );

      await putUpmAuth(someConfigPath, exampleRegistryUrl, {
        username: "user",
        password: "pass",
        email: someEmail,
      });

      expect(writeFile).toHaveBeenCalledWith(
        someConfigPath,
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          _auth: "dXNlcjpwYXNz", // user:pass
          email: someEmail,
        })
      );
    });

    it("should replace entry of different type", async () => {
      const { putUpmAuth, readFile, writeFile } = makeDependencies();
      readFile.mockResolvedValue(
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          token: someToken,
        })
      );

      await putUpmAuth(someConfigPath, exampleRegistryUrl, {
        username: "user",
        password: "pass",
        email: someEmail,
      });

      expect(writeFile).toHaveBeenCalledWith(
        someConfigPath,
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          _auth: "dXNlcjpwYXNz", // user:pass
          email: someEmail,
        })
      );
    });

    it("should replace entry for url that has trailing slash", async () => {
      const { putUpmAuth, readFile, writeFile } = makeDependencies();
      readFile.mockResolvedValue(
        makeUpmConfigEntryToml({
          // This entry has an url with a trailing slash, but it should
          // still be replaced.
          url: exampleRegistryUrl + "/",
          token: someToken,
        })
      );

      await putUpmAuth(someConfigPath, exampleRegistryUrl, {
        username: "user",
        password: "pass",
        email: someEmail,
      });

      expect(writeFile).toHaveBeenCalledWith(
        someConfigPath,
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          _auth: "dXNlcjpwYXNz", // user:pass
          email: someEmail,
        })
      );
    });

    it("should keep email of token entry", async () => {
      const { putUpmAuth, readFile, writeFile } = makeDependencies();
      readFile.mockResolvedValue(
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          token: someToken,
          email: someEmail,
        })
      );

      await putUpmAuth(someConfigPath, exampleRegistryUrl, {
        token: otherToken,
      });

      expect(writeFile).toHaveBeenCalledWith(
        someConfigPath,
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          token: otherToken,
          email: someEmail,
        })
      );
    });

    it("should keep always auth if no replacement was provided", async () => {
      const { putUpmAuth, readFile, writeFile } = makeDependencies();
      readFile.mockResolvedValue(
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          token: someToken,
          alwaysAuth: true,
        })
      );

      await putUpmAuth(someConfigPath, exampleRegistryUrl, {
        token: otherToken,
      });

      expect(writeFile).toHaveBeenCalledWith(
        someConfigPath,
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          token: otherToken,
          alwaysAuth: true,
        })
      );
    });
  });
});
