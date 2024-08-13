import { makeRemoveCmd } from "../../src/cli/cmd-remove";
import { DomainName } from "../../src/domain/domain-name";
import { SemanticVersion } from "../../src/domain/semantic-version";
import { GetRegistryAuth } from "../../src/services/get-registry-auth";
import { Env, ParseEnv } from "../../src/services/parse-env";
import { RemovePackages } from "../../src/services/remove-packages";
import { AsyncOk } from "../../src/utils/result-utils";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockService } from "../services/service.mock";
import { makeMockLogger } from "./log.mock";

const somePackage = DomainName.parse("com.some.package");
const defaultEnv = {
  cwd: "/users/some-user/projects/SomeProject",
  primaryRegistryUrl: exampleRegistryUrl,
} as Env;

function makeDependencies() {
  const parseEnv = mockService<ParseEnv>();
  parseEnv.mockResolvedValue(defaultEnv);

  const removePackages = mockService<RemovePackages>();
  removePackages.mockReturnValue(
    AsyncOk([{ name: somePackage, version: "1.0.0" as SemanticVersion }])
  );

  const getRegistryAuth = mockService<GetRegistryAuth>();
  getRegistryAuth.mockResolvedValue({
    url: defaultEnv.primaryRegistryUrl,
    auth: null,
  });

  const log = makeMockLogger();

  const removeCmd = makeRemoveCmd(parseEnv, removePackages, log);
  return {
    removeCmd,
    parseEnv,
    removePackages,
    getRegistryAuth,
    log,
  } as const;
}

describe("cmd-remove", () => {
  it("should print removed packages", async () => {
    const { removeCmd, log } = makeDependencies();

    await removeCmd([somePackage], {});

    expect(log.notice).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining(`${somePackage}@1.0.0`)
    );
  });

  it("should suggest to open Unity after save", async () => {
    const { removeCmd, log } = makeDependencies();

    await removeCmd([somePackage], {});

    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining("open Unity")
    );
  });
});
