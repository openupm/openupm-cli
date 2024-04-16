import { emptyNpmrc, setToken } from "./npmrc";

import { exampleRegistryUrl } from "./data-registry";

const exampleToken = "123-456-789";
const normalizedRegistryUrl = "//example.com/";

describe("npmrc", () => {
  describe("set token", () => {
    it("should add token if registry does not exist", async () => {
      const initial = ["key1=value1"];

      const actual = setToken(initial, exampleRegistryUrl, exampleToken);

      expect(actual).toEqual([
        "key1=value1",
        `${normalizedRegistryUrl}:_authToken=${exampleToken}`,
      ]);
    });

    it("should update token if registry exists", async () => {
      const initial = [`${normalizedRegistryUrl}:_authToken=SomeOtherToken`];

      const actual = setToken(initial, exampleRegistryUrl, exampleToken);

      expect(actual).toEqual([
        `${normalizedRegistryUrl}:_authToken=${exampleToken}`,
      ]);
    });

    it("should quote token if it includes =", async () => {
      const actual = setToken(emptyNpmrc, exampleRegistryUrl, "=123-456-789=");

      expect(actual).toEqual([
        `${normalizedRegistryUrl}:_authToken="=123-456-789="`,
      ]);
    });

    it("should quote token if it includes ?", async () => {
      const actual = setToken(emptyNpmrc, exampleRegistryUrl, "?123-456-789?");

      expect(actual).toEqual([
        `${normalizedRegistryUrl}:_authToken="?123-456-789?"`,
      ]);
    });
  });
});
