import { makeLoginCmd } from "../../../src/cli/cmd-login";
import { GetUpmConfigPath } from "../../../src/io/upm-config-io";
import { GetRegistryAuth } from "../../../src/services/get-registry-auth";
import { Login } from "../../../src/services/login";
import { Env, ParseEnv } from "../../../src/services/parse-env";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockService } from "../services/service.mock";
import { makeMockLogger } from "./log.mock";

const defaultEnv = {
  cwd: "/users/some-user/projects/SomeProject",
  upstream: true,
  primaryRegistryUrl: exampleRegistryUrl,
} as Env;

const exampleUser = "user";
const examplePassword = "pass";
const exampleEmail = "user@email.com";
const exampleUpmConfigPath = "/user/home/.upmconfig.toml";

describe("cmd-login", () => {
  function makeDependencies() {
    const parseEnv = mockService<ParseEnv>();
    parseEnv.mockResolvedValue(defaultEnv);

    const getUpmConfigPath = mockService<GetUpmConfigPath>();
    getUpmConfigPath.mockReturnValue(exampleUpmConfigPath);

    const login = mockService<Login>();
    login.mockResolvedValue(undefined);

    const getRegistryAuth = mockService<GetRegistryAuth>();
    getRegistryAuth.mockResolvedValue({ url: exampleRegistryUrl, auth: null });

    const log = makeMockLogger();

    const loginCmd = makeLoginCmd(parseEnv, getUpmConfigPath, login, log);
    return {
      loginCmd,
      parseEnv,
      getUpmConfigPath,
      login,
      getRegistryAuth,
      log,
    } as const;
  }

  // TODO: Add tests for prompting logic

  it("should notify of success", async () => {
    const { loginCmd, log } = makeDependencies();

    await loginCmd({
      username: exampleUser,
      password: examplePassword,
      email: exampleEmail,
      registry: exampleRegistryUrl,
    });

    expect(log.notice).toHaveBeenCalledWith(
      "config",
      expect.stringContaining("saved unity config")
    );
  });
});
