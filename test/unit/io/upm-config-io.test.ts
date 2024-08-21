import { EOL } from "node:os";
import { ReadTextFile } from "../../../src/io/text-file-io";
import { ReadUpmConfigFile } from "../../../src/io/upm-config-io";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockService } from "../services/service.mock";

jest.mock("../../../src/utils/env-util");

describe("upm-config-io", () => {
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
