import { mockService } from "./service.mock";
import { makePutRegistryAuth } from "../../src/services/put-registry-auth";
import { LoadUpmConfig, SaveUpmConfig } from "../../src/io/upm-config-io";
import { exampleRegistryUrl } from "../domain/data-registry";
import { Base64 } from "../../src/domain/base64";

describe("put registry auth", () => {
  const someConfigPath = "/home/user/.upmconfig.toml";
  const someEmail = "user@mail.com";
  const someToken = "isehusehgusheguszg8gshg";
  const otherToken = "8zseg974wge4g94whfheghf";

  function makeDependencies() {
    const loadUpmConfig = mockService<LoadUpmConfig>();
    loadUpmConfig.mockResolvedValue({});

    const saveUpmConfig = mockService<SaveUpmConfig>();
    saveUpmConfig.mockResolvedValue();

    const putRegistryAuth = makePutRegistryAuth(loadUpmConfig, saveUpmConfig);
    return { putRegistryAuth, loadUpmConfig, saveUpmConfig } as const;
  }

  it("should add entry if it does not exist", async () => {
    const { putRegistryAuth, saveUpmConfig } = makeDependencies();

    await putRegistryAuth(someConfigPath, exampleRegistryUrl, {
      token: someToken,
    });

    expect(saveUpmConfig).toHaveBeenCalledWith(
      {
        npmAuth: {
          [exampleRegistryUrl]: {
            token: someToken,
          },
        },
      },
      someConfigPath
    );
  });

  it("should replace entry of same type", async () => {
    const { putRegistryAuth, loadUpmConfig, saveUpmConfig } =
      makeDependencies();
    loadUpmConfig.mockResolvedValue({
      npmAuth: {
        [exampleRegistryUrl]: {
          _auth: "dXNlcjpwYXNz" as Base64, // user:pass
          email: "other@email.com",
        },
      },
    });

    await putRegistryAuth(someConfigPath, exampleRegistryUrl, {
      username: "user",
      password: "pass",
      email: someEmail,
    });

    expect(saveUpmConfig).toHaveBeenCalledWith(
      {
        npmAuth: {
          [exampleRegistryUrl]: {
            _auth: "dXNlcjpwYXNz" as Base64, // user:pass
            email: someEmail,
          },
        },
      },
      someConfigPath
    );
  });

  it("should replace entry of different type", async () => {
    const { putRegistryAuth, loadUpmConfig, saveUpmConfig } =
      makeDependencies();
    loadUpmConfig.mockResolvedValue({
      npmAuth: {
        [exampleRegistryUrl]: {
          token: someToken,
        },
      },
    });

    await putRegistryAuth(someConfigPath, exampleRegistryUrl, {
      username: "user",
      password: "pass",
      email: someEmail,
    });

    expect(saveUpmConfig).toHaveBeenCalledWith(
      {
        npmAuth: {
          [exampleRegistryUrl]: {
            _auth: "dXNlcjpwYXNz" as Base64, // user:pass
            email: someEmail,
          },
        },
      },
      someConfigPath
    );
  });

  it("should replace entry for url that has trailing slash", async () => {
    const { putRegistryAuth, loadUpmConfig, saveUpmConfig } =
      makeDependencies();
    loadUpmConfig.mockResolvedValue({
      // This entry has an url with a trailing slash, but it should
      // still be replaced.
      [exampleRegistryUrl + "/"]: {
        token: someToken,
      },
    });

    await putRegistryAuth(someConfigPath, exampleRegistryUrl, {
      username: "user",
      password: "pass",
      email: someEmail,
    });

    expect(saveUpmConfig).toHaveBeenCalledWith(
      {
        npmAuth: {
          [exampleRegistryUrl]: {
            _auth: "dXNlcjpwYXNz" as Base64, // user:pass
            email: someEmail,
          },
        },
      },
      someConfigPath
    );
  });

  it("should keep email of token entry", async () => {
    const { putRegistryAuth, loadUpmConfig, saveUpmConfig } =
      makeDependencies();
    loadUpmConfig.mockResolvedValue({
      npmAuth: {
        [exampleRegistryUrl]: {
          token: someToken,
          email: someEmail,
        },
      },
    });

    await putRegistryAuth(someConfigPath, exampleRegistryUrl, {
      token: otherToken,
    });

    expect(saveUpmConfig).toHaveBeenCalledWith(
      {
        npmAuth: {
          [exampleRegistryUrl]: {
            token: otherToken,
            email: someEmail,
          },
        },
      },
      someConfigPath
    );
  });

  it("should keep always auth if no replacement was provided", async () => {
    const { putRegistryAuth, loadUpmConfig, saveUpmConfig } =
      makeDependencies();
    loadUpmConfig.mockResolvedValue({
      npmAuth: {
        [exampleRegistryUrl]: {
          token: someToken,
          alwaysAuth: true,
        },
      },
    });

    await putRegistryAuth(someConfigPath, exampleRegistryUrl, {
      token: otherToken,
    });

    expect(saveUpmConfig).toHaveBeenCalledWith(
      {
        npmAuth: {
          [exampleRegistryUrl]: {
            token: otherToken,
            alwaysAuth: true,
          },
        },
      },
      someConfigPath
    );
  });
});
