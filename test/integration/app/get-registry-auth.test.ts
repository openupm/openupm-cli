import {
  importNpmAuth,
  isNonAuthUrl,
  LoadRegistryAuthFromUpmConfig,
  tryGetAuthEntry,
} from "../../../src/app/get-registry-auth";
import { Base64 } from "../../../src/domain/base64";
import {
  openupmRegistryUrl,
  unityRegistryUrl,
} from "../../../src/domain/registry-url";
import { LoadUpmConfig } from "../../../src/io/upm-config-io";
import { noopLogger } from "../../../src/logging";
import { exampleRegistryUrl } from "../../common/data-registry";
import { mockFunctionOfType } from "./func.mock";

describe("get registry auth from upm config", () => {
  const someEmail = "user@mail.com";
  const someToken = "isehusehgusheguszg8gshg";

  describe("registry needs no auth", () => {
    it("should be true for Unity registry", () => {
      const actual = isNonAuthUrl(unityRegistryUrl);
      expect(actual).toBeTruthy();
    });

    it("should be true for OpenUPM registry", () => {
      const actual = isNonAuthUrl(openupmRegistryUrl);
      expect(actual).toBeTruthy();
    });

    it("should be false for other registries", () => {
      const actual = isNonAuthUrl(exampleRegistryUrl);
      expect(actual).toBeFalsy();
    });
  });

  describe("auth import", () => {
    it("should get valid basic auth", () => {
      const actual = importNpmAuth({
        _auth: "dXNlcjpwYXNz" as Base64, // user:pass
        email: someEmail,
        alwaysAuth: true,
      });

      expect(actual).toEqual({
        username: "user",
        password: "pass",
        email: someEmail,
        alwaysAuth: true,
      });
    });

    it("should get valid token auth", () => {
      const auth = importNpmAuth({
        token: someToken,
        alwaysAuth: true,
      });

      expect(auth).toEqual({
        token: someToken,
        alwaysAuth: true,
      });
    });

    it("should ignore email when getting token auth", () => {
      const auth = importNpmAuth({
        token: someToken,
        email: someEmail,
      });

      expect(auth).toEqual({
        token: someToken,
      });
    });
  });

  describe("get entry", () => {
    it("should have no auth if there is no entry for registry", () => {
      const auth = tryGetAuthEntry({}, exampleRegistryUrl);

      expect(auth).toBeNull();
    });

    it("should get auth for url without trailing slash", () => {
      const auth = tryGetAuthEntry(
        { npmAuth: { [exampleRegistryUrl]: { token: someToken } } },
        exampleRegistryUrl
      );

      expect(auth).toEqual({
        token: someToken,
      });
    });

    it("should get auth for url with trailing slash", () => {
      const auth = tryGetAuthEntry(
        { npmAuth: { [exampleRegistryUrl + "/"]: { token: someToken } } },
        exampleRegistryUrl
      );

      expect(auth).toEqual({
        token: someToken,
      });
    });
  });

  describe("service", () => {
    const someUpmConfigPath = "/home/user/.upmconfig.toml";

    function makeDependencies() {
      const loadUpmConfig = mockFunctionOfType<LoadUpmConfig>();
      loadUpmConfig.mockResolvedValue({});

      const getRegistryAuth = LoadRegistryAuthFromUpmConfig(
        loadUpmConfig,
        noopLogger
      );
      return { getRegistryAuth, loadUpmConfig } as const;
    }

    it("should have no auth if no .upmconfig.toml file", async () => {
      const { getRegistryAuth, loadUpmConfig } = makeDependencies();
      loadUpmConfig.mockResolvedValue(null);

      const registry = await getRegistryAuth(
        someUpmConfigPath,
        exampleRegistryUrl
      );

      expect(registry.auth).toBeNull();
    });

    it("should not load upmconfig for openupm registry url", async () => {
      const { getRegistryAuth, loadUpmConfig } = makeDependencies();

      await getRegistryAuth(someUpmConfigPath, openupmRegistryUrl);

      expect(loadUpmConfig).not.toHaveBeenCalled();
    });

    it("should not load upmconfig for unity registry url", async () => {
      const { getRegistryAuth, loadUpmConfig } = makeDependencies();

      await getRegistryAuth(someUpmConfigPath, unityRegistryUrl);

      expect(loadUpmConfig).not.toHaveBeenCalled();
    });

    it("should cache .upmconfig.toml content", async () => {
      const { getRegistryAuth, loadUpmConfig } = makeDependencies();

      await getRegistryAuth(someUpmConfigPath, exampleRegistryUrl);
      await getRegistryAuth(someUpmConfigPath, exampleRegistryUrl);

      expect(loadUpmConfig).toHaveBeenCalledTimes(1);
    });
  });
});
