import { LoadUpmConfig, SaveUpmConfig } from "../../src/io/upm-config-io";
import { makeSaveAuthToUpmConfig } from "../../src/services/upm-auth";
import { mockService } from "./service.mock";
import { exampleRegistryUrl } from "../domain/data-registry";
import {
  encodeBasicAuth,
  UpmAuth,
  UpmAuthMalformedError,
  UPMConfig,
} from "../../src/domain/upm-config";
import { unityRegistryUrl } from "../../src/domain/registry-url";

describe("upm auth", () => {
  const someConfigPath = "/some/path/.upmconfig.toml";

  const someAuth: UpmAuth = {
    _auth: encodeBasicAuth("a", "b"),
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
      {
        npmAuth: { [exampleRegistryUrl]: someAuth },
      } satisfies UPMConfig,
      someConfigPath
    );
  });

  it("should update existing config if found", async () => {
    const { saveAuthToUpmConfig, loadUpmConfig, saveUpmConfig } =
      makeDependencies();
    loadUpmConfig.mockResolvedValue({
      npmAuth: {
        [unityRegistryUrl]: someAuth,
      },
    } satisfies UPMConfig);

    await saveAuthToUpmConfig(someConfigPath, exampleRegistryUrl, someAuth);

    expect(saveUpmConfig).toHaveBeenCalledWith(
      {
        npmAuth: {
          [unityRegistryUrl]: someAuth,
          [exampleRegistryUrl]: someAuth,
        },
      } satisfies UPMConfig,
      someConfigPath
    );
  });
});
