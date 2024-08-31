import path from "path";
import {
  getUserUpmConfigPathFor,
  NoSystemUserProfilePath,
} from "../../../src/domain/upm-config";

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
});
