import { Err, Ok } from "ts-results-es";
import { makeLoginCmd } from "../../src/cli/cmd-login";
import { mockService } from "../services/service.mock";
import { Env, ParseEnv } from "../../src/services/parse-env";
import {
  GetUpmConfigPath,
  RequiredEnvMissingError,
} from "../../src/io/upm-config-io";
import { Login } from "../../src/services/login";
import { makeMockLogger } from "./log.mock";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";
import { RegistryAuthenticationError } from "../../src/io/common-errors";
import { ResultCodes } from "../../src/cli/result-codes";
import { AsyncErr, AsyncOk } from "../../src/utils/result-utils";

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
    parseEnv.mockResolvedValue(Ok(defaultEnv));

    const getUpmConfigPath = mockService<GetUpmConfigPath>();
    getUpmConfigPath.mockResolvedValue(exampleUpmConfigPath);

    const login = mockService<Login>();
    login.mockReturnValue(AsyncOk());

    const log = makeMockLogger();

    const loginCmd = makeLoginCmd(parseEnv, getUpmConfigPath, login, log);
    return { loginCmd, parseEnv, getUpmConfigPath, login, log } as const;
  }

  // TODO: Add tests for prompting logic

  it("should fail if login failed", async () => {
    const expected = new RequiredEnvMissingError([]);
    const { loginCmd, login } = makeDependencies();
    login.mockReturnValue(AsyncErr(expected));

    const resultCode = await loginCmd({
      username: exampleUser,
      password: examplePassword,
      email: exampleEmail,
      _global: { registry: exampleRegistryUrl },
    });

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should notify if unauthorized", async () => {
    const { loginCmd, login, log } = makeDependencies();
    login.mockReturnValue(
      Err(new RegistryAuthenticationError()).toAsyncResult()
    );

    await loginCmd({
      username: exampleUser,
      password: examplePassword,
      email: exampleEmail,
      _global: { registry: exampleRegistryUrl },
    });

    expect(log.warn).toHaveBeenCalledWith(
      "401",
      "Incorrect username or password"
    );
  });

  it("should notify of success", async () => {
    const { loginCmd, log } = makeDependencies();

    await loginCmd({
      username: exampleUser,
      password: examplePassword,
      email: exampleEmail,
      _global: { registry: exampleRegistryUrl },
    });

    expect(log.notice).toHaveBeenCalledWith(
      "config",
      expect.stringContaining("saved unity config")
    );
  });
});
