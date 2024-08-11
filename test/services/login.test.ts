import { makeLogin } from "../../src/services/login";
import { mockService } from "./service.mock";
import { PutRegistryAuth } from "../../src/services/put-registry-auth";
import { NpmLogin } from "../../src/services/npm-login";
import { StoreNpmAuthToken } from "../../src/services/put-npm-auth-token";
import { exampleRegistryUrl } from "../domain/data-registry";
import { noopLogger } from "../../src/logging";

const exampleUser = "user";
const examplePassword = "pass";
const exampleEmail = "user@email.com";
const exampleConfigPath = "/user/home/.upmconfig.toml";
const exampleNpmrcPath = "/user/home/.npmrc";
const exampleToken = "some token";

describe("login", () => {
  function makeDependencies() {
    const putRegistryAuth = mockService<PutRegistryAuth>();
    putRegistryAuth.mockResolvedValue(undefined);

    const npmLogin = mockService<NpmLogin>();
    npmLogin.mockResolvedValue(exampleToken);

    const putNpmAuthToken = mockService<StoreNpmAuthToken>();
    putNpmAuthToken.mockResolvedValue(exampleNpmrcPath);

    const login = makeLogin(
      putRegistryAuth,
      npmLogin,
      putNpmAuthToken,
      noopLogger
    );
    return { login, putRegistryAuth, npmLogin, putNpmAuthToken } as const;
  }

  describe("basic auth", () => {
    it("should save encoded auth data", async () => {
      const { login, putRegistryAuth } = makeDependencies();

      await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "basic"
      );

      expect(putRegistryAuth).toHaveBeenCalledWith(
        exampleConfigPath,
        exampleRegistryUrl,
        {
          username: exampleUser,
          password: examplePassword,
          email: exampleEmail,
          alwaysAuth: true,
        }
      );
    });
  });

  describe("token auth", () => {
    it("should save token", async () => {
      const { login, putRegistryAuth } = makeDependencies();

      await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "token"
      );

      expect(putRegistryAuth).toHaveBeenCalledWith(
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
