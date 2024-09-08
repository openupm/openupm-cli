import { NpmAuth } from "another-npm-registry-client";
import { makeNpmFetchOptions, Registry } from "../../../src/domain/registry";
import { exampleRegistryUrl } from "../../common/data-registry";

describe("npm registry", () => {
  describe("make fetch options from registry object", () => {
    it("should use input registry url", () => {
      const registry: Registry = {
        url: exampleRegistryUrl,
        auth: null,
      };

      const options = makeNpmFetchOptions(registry);

      expect(options.registry).toEqual(exampleRegistryUrl);
    });

    it("should have no auth data if input does not have one", () => {
      const registry: Registry = {
        url: exampleRegistryUrl,
        auth: null,
      };

      const options = makeNpmFetchOptions(registry);

      expect(options.username).not.toBeDefined();
      expect(options.password).not.toBeDefined();
      expect(options.email).not.toBeDefined();
      expect(options.token).not.toBeDefined();
      expect(options.alwaysAuth).not.toBeDefined();
    });

    it("should use token auth info", () => {
      const auth: NpmAuth = { token: "Some token", alwaysAuth: true };
      const registry: Registry = {
        url: exampleRegistryUrl,
        auth,
      };

      const options = makeNpmFetchOptions(registry);

      expect(options.username).not.toBeDefined();
      expect(options.password).not.toBeDefined();
      expect(options.email).not.toBeDefined();
      expect(options.token).toEqual(auth.token);
      expect(options.alwaysAuth).toEqual(auth.alwaysAuth);
    });

    it("should use basic auth info", () => {
      const auth: NpmAuth = {
        username: "user",
        password: "pass",
        email: "user@mail.com",
        alwaysAuth: true,
      };
      const registry: Registry = {
        url: exampleRegistryUrl,
        auth,
      };

      const options = makeNpmFetchOptions(registry);

      expect(options.username).toEqual(auth.username);
      expect(options.password).toEqual(auth.password);
      expect(options.email).toEqual(auth.email);
      expect(options.token).not.toBeDefined();
      expect(options.alwaysAuth).toEqual(auth.alwaysAuth);
    });
  });
});
