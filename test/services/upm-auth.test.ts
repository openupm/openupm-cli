import { LoadUpmConfig, SaveUpmConfig } from "../../src/io/upm-config-io";
import { makeSaveAuthToUpmConfig } from "../../src/services/upm-auth";
import { mockService } from "./service.mock";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";
import { NpmAuth } from "another-npm-registry-client";

describe("upm auth", () => {
  const someConfigPath = "/some/path/.upmconfig.toml";

  const someAuth: NpmAuth = {
    username: "a",
    password: "b",
    email: "some@email.com",
  };

  function makeDependencies() {
    const loadUpmConfig = mockService<LoadUpmConfig>();

    const saveUpmConfig = mockService<SaveUpmConfig>();

    const saveAuthToUpmConfig = makeSaveAuthToUpmConfig(
      loadUpmConfig,
      saveUpmConfig
    );
    return { saveAuthToUpmConfig, loadUpmConfig, saveUpmConfig } as const;
  }

  it("should use empty config if no config was found", async () => {
    const { saveAuthToUpmConfig, loadUpmConfig, saveUpmConfig } =
      makeDependencies();
    loadUpmConfig.mockResolvedValue(null);

    await saveAuthToUpmConfig(someConfigPath, exampleRegistryUrl, someAuth);

    expect(saveUpmConfig).toHaveBeenCalledWith(
      { [exampleRegistryUrl]: someAuth },
      someConfigPath
    );
  });

  it("should update existing config if found", async () => {
    const { saveAuthToUpmConfig, loadUpmConfig, saveUpmConfig } =
      makeDependencies();
    loadUpmConfig.mockResolvedValue({ [unityRegistryUrl]: someAuth });

    await saveAuthToUpmConfig(someConfigPath, exampleRegistryUrl, someAuth);

    expect(saveUpmConfig).toHaveBeenCalledWith(
      {
        [unityRegistryUrl]: someAuth,
        [exampleRegistryUrl]: someAuth,
      },
      someConfigPath
    );
  });
});
