import { makeLoginCmd } from "../../src/cli/cmd-login";
import { mockService } from "../services/service.mock";
import { Env, ParseEnv } from "../../src/services/parse-env";
import { GetUpmConfigPath } from "../../src/io/upm-config-io";
import { Login } from "../../src/services/login";
import { makeMockLogger } from "./log.mock";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";

const defaultEnv = {
  cwd: "/users/some-user/projects/SomeProject",
  upstream: true,
  registry: { url: exampleRegistryUrl, auth: null },
  upstreamRegistry: { url: unityRegistryUrl, auth: null },
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
    getUpmConfigPath.mockResolvedValue(exampleUpmConfigPath);

    const login = mockService<Login>();
    login.mockResolvedValue(undefined);

    const log = makeMockLogger();

    const loginCmd = makeLoginCmd(parseEnv, getUpmConfigPath, login, log);
    return { loginCmd, parseEnv, getUpmConfigPath, login, log } as const;
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
