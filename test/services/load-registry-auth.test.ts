import { exampleRegistryUrl } from "../domain/data-registry";
import { makeLoadRegistryAuth } from "../../src/services/load-registry-auth";
import { mockService } from "./service.mock";
import { LoadUpmConfig } from "../../src/io/upm-config-io";
import { emptyUpmConfig } from "../../src/domain/upm-config";
import { Base64 } from "../../src/domain/base64";

describe("load registry auth", () => {
  const someConfigPath = "/home/user/.upmconfig.toml";
  const someEmail = "user@mail.com";
  const someToken = "isehusehgusheguszg8gshg";

  function makeDependencies() {
    const loadUpmConfig = mockService<LoadUpmConfig>();

    const loadRegistryAuth = makeLoadRegistryAuth(loadUpmConfig);
    return { loadRegistryAuth, loadUpmConfig } as const;
  }

  it("should be empty if there is no upm config", async () => {
    const { loadRegistryAuth, loadUpmConfig } = makeDependencies();
    loadUpmConfig.mockResolvedValue(null);

    const actual = await loadRegistryAuth(someConfigPath);

    expect(actual).toEqual(emptyUpmConfig);
  });

  it("should import empty", async () => {
    const { loadRegistryAuth, loadUpmConfig } = makeDependencies();
    loadUpmConfig.mockResolvedValue({});

    const actual = await loadRegistryAuth(someConfigPath);

    expect(actual).toEqual(emptyUpmConfig);
  });

  it("should remove trailing slash on registry urls", async () => {
    const { loadRegistryAuth, loadUpmConfig } = makeDependencies();
    loadUpmConfig.mockResolvedValue({
      npmAuth: {
        [exampleRegistryUrl + "/"]: {
          _auth: "dXNlcjpwYXNz" as Base64, // user:pass
          email: someEmail,
          alwaysAuth: true,
        },
      },
    });

    const actual = await loadRegistryAuth(someConfigPath);

    expect(actual).toEqual({
      [exampleRegistryUrl]: {
        username: "user",
        password: "pass",
        email: someEmail,
        alwaysAuth: true,
      },
    });
  });

  it("should import valid basic auth", async () => {
    const { loadRegistryAuth, loadUpmConfig } = makeDependencies();
    loadUpmConfig.mockResolvedValue({
      npmAuth: {
        [exampleRegistryUrl]: {
          _auth: "dXNlcjpwYXNz" as Base64, // user:pass
          email: someEmail,
          alwaysAuth: true,
        },
      },
    });

    const actual = await loadRegistryAuth(someConfigPath);

    expect(actual).toEqual({
      [exampleRegistryUrl]: {
        username: "user",
        password: "pass",
        email: someEmail,
        alwaysAuth: true,
      },
    });
  });

  it("should import valid token auth", async () => {
    const { loadRegistryAuth, loadUpmConfig } = makeDependencies();
    loadUpmConfig.mockResolvedValue({
      npmAuth: { [exampleRegistryUrl]: { token: someToken, alwaysAuth: true } },
    });

    const actual = await loadRegistryAuth(someConfigPath);

    expect(actual).toEqual({
      [exampleRegistryUrl]: {
        token: someToken,
        alwaysAuth: true,
      },
    });
  });

  it("should ignore email when importing token auth", async () => {
    const { loadRegistryAuth, loadUpmConfig } = makeDependencies();
    loadUpmConfig.mockResolvedValue({
      npmAuth: {
        [exampleRegistryUrl]: {
          token: someToken,
          email: someEmail,
        },
      },
    });

    const actual = await loadRegistryAuth(someConfigPath);

    expect(actual).toEqual({
      [exampleRegistryUrl]: {
        token: someToken,
      },
    });
  });
});
