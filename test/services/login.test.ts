import { makeLoginService } from "../../src/services/login";
import { mockService } from "./service.mock";
import { SaveAuthToUpmConfig } from "../../src/services/upm-auth";
import {
  AuthenticationError,
  NpmLoginService,
} from "../../src/services/npm-login";
import { AuthNpmrcService } from "../../src/services/npmrc-auth";
import { exampleRegistryUrl } from "../domain/data-registry";
import { Err, Ok } from "ts-results-es";
import { IOError } from "../../src/io/file-io";

const exampleUser = "user";
const examplePassword = "pass";
const exampleEmail = "user@email.com";
const exampleConfigPath = "/user/home/.upmconfig.toml";
const exampleNpmrcPath = "/user/home/.npmrc";
const exampleToken = "some token";

describe("login", () => {
  function makeDependencies() {
    const saveAuthToUpmConfig = mockService<SaveAuthToUpmConfig>();
    saveAuthToUpmConfig.mockReturnValue(Ok(undefined).toAsyncResult());

    const npmLogin = mockService<NpmLoginService>();
    npmLogin.mockReturnValue(Ok(exampleToken).toAsyncResult());

    const authNpmrc = mockService<AuthNpmrcService>();
    authNpmrc.mockReturnValue(Ok(exampleNpmrcPath).toAsyncResult());

    const login = makeLoginService(saveAuthToUpmConfig, npmLogin, authNpmrc);
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
        "basic",
        () => {},
        () => {}
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
      const expected = new IOError();
      const { login, saveAuthToUpmConfig } = makeDependencies();
      saveAuthToUpmConfig.mockReturnValue(Err(expected).toAsyncResult());

      const result = await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "basic",
        () => {},
        () => {}
      ).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });
  });

  describe("token auth", () => {
    it("should fail if npm login fails", async () => {
      const expected = new AuthenticationError(401, "uh oh");
      const { login, npmLogin } = makeDependencies();
      npmLogin.mockReturnValue(Err(expected).toAsyncResult());

      const result = await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "token",
        () => {},
        () => {}
      ).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should notify of npm login success", async () => {
      const { login } = makeDependencies();
      const onNpmAuthSuccess = jest.fn();

      await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "token",
        onNpmAuthSuccess,
        () => {}
      ).promise;

      expect(onNpmAuthSuccess).toHaveBeenCalled();
    });

    it("should fail if npmrc auth fails", async () => {
      const expected = new IOError();
      const { login, authNpmrc } = makeDependencies();
      authNpmrc.mockReturnValue(Err(expected).toAsyncResult());

      const result = await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "token",
        () => {},
        () => {}
      ).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should notify of npmrc auth success", async () => {
      const { login } = makeDependencies();
      const onNpmrcUpdated = jest.fn();

      await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "token",
        () => {},
        onNpmrcUpdated
      ).promise;

      expect(onNpmrcUpdated).toHaveBeenCalledWith(exampleNpmrcPath);
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
        "token",
        () => {},
        () => {}
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

    it("should fail if config write fails", async () => {
      const expected = new IOError();
      const { login, saveAuthToUpmConfig } = makeDependencies();
      saveAuthToUpmConfig.mockReturnValue(Err(expected).toAsyncResult());

      const result = await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "token",
        () => {},
        () => {}
      ).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });
  });
});
