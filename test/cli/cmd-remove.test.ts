import { exampleRegistryUrl } from "../domain/data-registry";
import { Env, ParseEnv } from "../../src/services/parse-env";
import { makeRemoveCmd } from "../../src/cli/cmd-remove";
import { DomainName } from "../../src/domain/domain-name";
import { SemanticVersion } from "../../src/domain/semantic-version";
import { makeMockLogger } from "./log.mock";
import { mockService } from "../services/service.mock";
import { RemovePackages } from "../../src/services/remove-packages";
import { AsyncOk } from "../../src/utils/result-utils";

const somePackage = DomainName.parse("com.some.package");
const defaultEnv = {
  cwd: "/users/some-user/projects/SomeProject",
  registry: { url: exampleRegistryUrl, auth: null },
} as Env;

function makeDependencies() {
  const parseEnv = mockService<ParseEnv>();
  parseEnv.mockResolvedValue(defaultEnv);

  const removePackages = mockService<RemovePackages>();
  removePackages.mockReturnValue(
    AsyncOk([{ name: somePackage, version: "1.0.0" as SemanticVersion }])
  );

  const log = makeMockLogger();

  const removeCmd = makeRemoveCmd(parseEnv, removePackages, log);
  return {
    removeCmd,
    parseEnv,
    removePackages,
    log,
  } as const;
}

describe("cmd-remove", () => {
  it("should print removed packages", async () => {
    const { removeCmd, log } = makeDependencies();

    await removeCmd([somePackage], { _global: {} });

    expect(log.notice).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining(`${somePackage}@1.0.0`)
    );
  });

  it("should suggest to open Unity after save", async () => {
    const { removeCmd, log } = makeDependencies();

    await removeCmd([somePackage], { _global: {} });

    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining("open Unity")
    );
  });
});
