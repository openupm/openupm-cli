import { makeLogin } from "../../src/services/login";
import { mockService } from "./service.mock";
import { SaveAuthToUpmConfig } from "../../src/services/upm-auth";
import { NpmLogin } from "../../src/services/npm-login";
import { AuthNpmrc } from "../../src/services/npmrc-auth";
import { exampleRegistryUrl } from "../domain/data-registry";
import { noopLogger } from "../../src/logging";
import {
  GenericIOError,
  RegistryAuthenticationError,
} from "../../src/io/common-errors";
import { AsyncErr, AsyncOk } from "../../src/utils/result-utils";

const exampleUser = "user";
const examplePassword = "pass";
const exampleEmail = "user@email.com";
const exampleConfigPath = "/user/home/.upmconfig.toml";
const exampleNpmrcPath = "/user/home/.npmrc";
const exampleToken = "some token";

describe("login", () => {
  function makeDependencies() {
    const saveAuthToUpmConfig = mockService<SaveAuthToUpmConfig>();
    saveAuthToUpmConfig.mockResolvedValue(undefined);

    const npmLogin = mockService<NpmLogin>();
    npmLogin.mockReturnValue(AsyncOk(exampleToken));

    const authNpmrc = mockService<AuthNpmrc>();
    authNpmrc.mockResolvedValue(exampleNpmrcPath);

    const login = makeLogin(
      saveAuthToUpmConfig,
      npmLogin,
      authNpmrc,
      noopLogger
    );
    return { login, saveAuthToUpmConfig, npmLogin, authNpmrc } as const;
  }

  describe("basic auth", () => {
    it("should save encoded auth data", async () => {
      const { login, saveAuthToUpmConfig } = makeDependencies();

      await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "basic"
      ).promise;

      expect(saveAuthToUpmConfig).toHaveBeenCalledWith(
        exampleConfigPath,
        exampleRegistryUrl,
        {
          email: exampleEmail,
          alwaysAuth: true,
          _auth: "dXNlcjpwYXNz",
        }
      );
    });

    it("should fail if config write fails", async () => {
      const expected = new GenericIOError("Write");
      const { login, saveAuthToUpmConfig } = makeDependencies();
      saveAuthToUpmConfig.mockRejectedValue(expected);

      const result = await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "basic"
      ).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });
  });

  describe("token auth", () => {
    it("should fail if npm login fails", async () => {
      const expected = new RegistryAuthenticationError();
      const { login, npmLogin } = makeDependencies();
      npmLogin.mockReturnValue(AsyncErr(expected));

      const result = await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "token"
      ).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should save token", async () => {
      const { login, saveAuthToUpmConfig } = makeDependencies();

      await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "token"
      ).promise;

      expect(saveAuthToUpmConfig).toHaveBeenCalledWith(
        exampleConfigPath,
        exampleRegistryUrl,
        {
          email: exampleEmail,
          alwaysAuth: true,
          token: exampleToken,
        }
      );
    });
  });
});
