import nock from "nock";
import npmFetch, { type AuthOptions } from "npm-registry-fetch";
import { makeNpmFetchOptions, Registry } from "../../../src/domain/registry";
import { someRegistryUrl } from "../../common/data-registry";

describe("npm registry", () => {
  describe("make fetch options from registry object", () => {
    it("should use input registry url", () => {
      const registry: Registry = {
        url: someRegistryUrl,
        auth: null,
      };

      const options = makeNpmFetchOptions(registry);

      expect(options.registry).toEqual(someRegistryUrl);
    });

    it("should have no auth data if input does not have one", () => {
      const registry: Registry = {
        url: someRegistryUrl,
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
      const auth: AuthOptions = { token: "Some token", alwaysAuth: true };
      const registry: Registry = {
        url: someRegistryUrl,
        auth,
      };

      const options = makeNpmFetchOptions(registry);

      expect(options.forceAuth).toEqual(auth);
    });

    it("should use basic auth info with base64 encoded password", () => {
      const auth: AuthOptions = {
        username: "user",
        password: "pass",
        email: "user@mail.com",
        alwaysAuth: true,
      };
      const registry: Registry = {
        url: someRegistryUrl,
        auth,
      };

      const options = makeNpmFetchOptions(registry);

      expect(options.forceAuth).toEqual({ ...auth, password: "cGFzcw==" });
    });

    it("should send token as bearer authorization header", async () => {
      const registry: Registry = {
        url: someRegistryUrl,
        auth: { token: "Some token" },
      };
      nock(someRegistryUrl)
        .get("/some.package")
        .matchHeader("authorization", "Bearer Some token")
        .reply(200, {});

      await npmFetch.json(
        `${someRegistryUrl}/some.package`,
        makeNpmFetchOptions(registry)
      );

      expect(nock.isDone()).toBeTruthy();
    });

    it("should send basic authorization header", async () => {
      const registry: Registry = {
        url: someRegistryUrl,
        auth: { username: "user", password: "pass" },
      };
      nock(someRegistryUrl)
        .get("/some.package")
        .matchHeader("authorization", "Basic dXNlcjpwYXNz")
        .reply(200, {});

      await npmFetch.json(
        `${someRegistryUrl}/some.package`,
        makeNpmFetchOptions(registry)
      );

      expect(nock.isDone()).toBeTruthy();
    });
  });
});
