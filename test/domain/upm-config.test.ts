import { tryGetAuthForRegistry, UPMConfig } from "../../src/domain/upm-config";
import { NpmAuth } from "another-npm-registry-client";

import { exampleRegistryUrl } from "./data-registry";

describe("upm-config", () => {
  const someAuth: NpmAuth = {
    username: "user",
    password: "pass",
    email: "email@wow.com",
  };

  describe("get auth for registry", () => {
    it("should find auth that was added", () => {
      const config: UPMConfig = {
        [exampleRegistryUrl]: someAuth,
      };

      const actual = tryGetAuthForRegistry(config, exampleRegistryUrl);

      expect(actual).toEqual(someAuth);
    });

    it("should not find auth for url that does not exist", () => {
      const config: UPMConfig = {};

      const actual = tryGetAuthForRegistry(config, exampleRegistryUrl);

      expect(actual).toBeNull();
    });
  });
});
