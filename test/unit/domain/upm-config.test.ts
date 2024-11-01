import { EOL } from "os";
import path from "path";
import {
  getUserUpmConfigPathFor,
  NoSystemUserProfilePath,
  parseUpmConfig,
} from "../../../src/domain/upm-config.js";
import { someRegistryUrl } from "../../common/data-registry.js";

describe("upm config", () => {
  describe("get user config path", () => {
    const someHomeDirectory = path.resolve("/home/user/");
    const someAllUsersDirectory = path.resolve("/all-users/");

    it("should be UPM_USER_CONFIG_FILE env if set", () => {
      const expected = path.resolve("/home/user/.config/.upmconfig.toml");

      const upmConfigPath = getUserUpmConfigPathFor(
        { UPM_USER_CONFIG_FILE: expected },
        someHomeDirectory,
        false
      );

      expect(upmConfigPath).toEqual(expected);
    });

    it("should be home path for regular users", () => {
      const expected = path.join(someHomeDirectory, ".upmconfig.toml");

      const upmConfigPath = getUserUpmConfigPathFor(
        {},
        someHomeDirectory,
        false
      );

      expect(upmConfigPath).toEqual(expected);
    });

    it("should be service account path for system user", () => {
      const expected = path.join(
        someAllUsersDirectory,
        "/Unity/config/ServiceAccounts/.upmconfig.toml"
      );

      const upmConfigPath = getUserUpmConfigPathFor(
        { ALLUSERSPROFILE: someAllUsersDirectory },
        someHomeDirectory,
        true
      );

      expect(upmConfigPath).toEqual(expected);
    });

    it("should be fail for system user if required env is not set", () => {
      expect(() =>
        getUserUpmConfigPathFor({}, someHomeDirectory, true)
      ).toThrow(NoSystemUserProfilePath);
    });
  });

  describe("parse", () => {
    const someEmail = "user@mail.com";
    const someToken = "isehusehgusheguszg8gshg";

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

    it("should parse empty", () => {
      const actual = parseUpmConfig("");

      expect(actual).toEqual({});
    });

    it("should parse valid basic auth", () => {
      const actual = parseUpmConfig(
        makeUpmConfigEntryToml({
          url: someRegistryUrl,
          _auth: "dXNlcjpwYXNz", // user:pass
          email: someEmail,
          alwaysAuth: true,
        })
      );

      expect(actual).toEqual({
        npmAuth: {
          [someRegistryUrl]: {
            _auth: "dXNlcjpwYXNz", // user:pass
            email: someEmail,
            alwaysAuth: true,
          },
        },
      });
    });

    it("should load valid token auth", () => {
      const actual = parseUpmConfig(
        makeUpmConfigEntryToml({
          url: someRegistryUrl,
          token: someToken,
          alwaysAuth: true,
        })
      );

      expect(actual).toEqual({
        npmAuth: {
          [someRegistryUrl]: {
            token: someToken,
            alwaysAuth: true,
          },
        },
      });
    });
  });
});
