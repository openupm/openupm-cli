import { makeLogin } from "../../src/services/login";
import { mockService } from "./service.mock";
import { NpmLogin } from "../../src/services/npm-login";
import { AuthNpmrc } from "../../src/services/npmrc-auth";
import { exampleRegistryUrl } from "../domain/data-registry";
import { noopLogger } from "../../src/logging";
import { PutUpmAuth } from "../../src/io/upm-config-io";

const exampleUser = "user";
const examplePassword = "pass";
const exampleEmail = "user@email.com";
const exampleConfigPath = "/user/home/.upmconfig.toml";
const exampleNpmrcPath = "/user/home/.npmrc";
const exampleToken = "some token";

describe("login", () => {
  function makeDependencies() {
    const putUpmAuth = mockService<PutUpmAuth>();
    putUpmAuth.mockResolvedValue(undefined);

    const npmLogin = mockService<NpmLogin>();
    npmLogin.mockResolvedValue(exampleToken);

    const authNpmrc = mockService<AuthNpmrc>();
    authNpmrc.mockResolvedValue(exampleNpmrcPath);

    const login = makeLogin(putUpmAuth, npmLogin, authNpmrc, noopLogger);
    return { login, putUpmAuth, npmLogin, authNpmrc } as const;
  }

  describe("basic auth", () => {
    it("should save encoded auth data", async () => {
      const { login, putUpmAuth } = makeDependencies();

      await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "basic"
      );

      expect(putUpmAuth).toHaveBeenCalledWith(
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
      const { login, putUpmAuth } = makeDependencies();

      await login(
        exampleUser,
        examplePassword,
        exampleEmail,
        true,
        exampleRegistryUrl,
        exampleConfigPath,
        "token"
      );

      expect(putUpmAuth).toHaveBeenCalledWith(
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
