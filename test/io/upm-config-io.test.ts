import { EOL } from "node:os";
import path from "path";
import { GetHomePath } from "../../src/io/special-paths";
import { ReadTextFile } from "../../src/io/text-file-io";
import {
  ReadUpmConfigFile,
  ResolveDefaultUpmConfigPath,
} from "../../src/io/upm-config-io";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockService } from "../services/service.mock";

describe("upm-config-io", () => {
  describe("resolve default path", () => {
    function makeDependencies() {
      const getHomePath = mockService<GetHomePath>();

      const resolveDefaultUpmConfigPath =
        ResolveDefaultUpmConfigPath(getHomePath);

      return { resolveDefaultUpmConfigPath, getHomePath } as const;
    }

    describe("no system-user", () => {
      it("should be in home path", async () => {
        const { resolveDefaultUpmConfigPath, getHomePath } = makeDependencies();
        const expected = path.resolve("/some/home/dir/.upmconfig.toml");
        getHomePath.mockReturnValue(path.dirname(expected));

        const actual = await resolveDefaultUpmConfigPath(false);

        expect(actual).toEqual(expected);
      });
    });
  });

  describe("read file", () => {
    const someConfigPath = "/home/user/.upmconfig.toml";
    const someEmail = "user@mail.com";
    const someToken = "isehusehgusheguszg8gshg";

    function makeDependencies() {
      const readFile = mockService<ReadTextFile>();
      readFile.mockResolvedValue("");

      const readUpmConfigFile = ReadUpmConfigFile(readFile);
      return { readUpmConfigFile, readFile } as const;
    }

    function makeUpmConfigEntryToml(entry: {
      url: string;
      _auth?: string;
      email?: string;
      alwaysAuth?: boolean;
      token?: string;
    }): string {
      const lines = [`[npmAuth."${entry.url}"]`];
      if (entry._auth !== undefined) lines.push(`_auth = "${entry._auth}"`);
      if (entry.email !== undefined) lines.push(`email = "${entry.email}"`);
      if (entry.token !== undefined) lines.push(`token = "${entry.token}"`);
      if (entry.alwaysAuth !== undefined)
        lines.push(`alwaysAuth = ${entry.alwaysAuth}`);
      return lines.join(EOL);
    }

    it("should be null if file is not found", async () => {
      const { readUpmConfigFile, readFile } = makeDependencies();
      readFile.mockResolvedValue(null);

      const actual = await readUpmConfigFile(someConfigPath);

      expect(actual).toBeNull();
    });

    it("should load empty", async () => {
      const { readUpmConfigFile, readFile } = makeDependencies();
      readFile.mockResolvedValue("");

      const actual = await readUpmConfigFile(someConfigPath);

      expect(actual).toEqual({});
    });

    it("should load valid basic auth", async () => {
      const { readUpmConfigFile, readFile } = makeDependencies();
      readFile.mockResolvedValue(
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          _auth: "dXNlcjpwYXNz", // user:pass
          email: someEmail,
          alwaysAuth: true,
        })
      );

      const actual = await readUpmConfigFile(someConfigPath);

      expect(actual).toEqual({
        npmAuth: {
          [exampleRegistryUrl]: {
            _auth: "dXNlcjpwYXNz", // user:pass
            email: someEmail,
            alwaysAuth: true,
          },
        },
      });
    });

    it("should load valid token auth", async () => {
      const { readUpmConfigFile, readFile } = makeDependencies();
      readFile.mockResolvedValue(
        makeUpmConfigEntryToml({
          url: exampleRegistryUrl,
          token: someToken,
          alwaysAuth: true,
        })
      );

      const actual = await readUpmConfigFile(someConfigPath);

      expect(actual).toEqual({
        npmAuth: {
          [exampleRegistryUrl]: {
            token: someToken,
            alwaysAuth: true,
          },
        },
      });
    });
  });
});
