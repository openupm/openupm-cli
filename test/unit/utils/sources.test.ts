import { queryAllRegistriesLazy } from "../../../src/utils/sources";
import { Registry } from "../../../src/domain/registry";
import { exampleRegistryUrl } from "../../common/data-registry";
import { unityRegistryUrl } from "../../../src/domain/registry-url";

describe("sources", () => {
  describe("query registries lazy", () => {
    const exampleRegistryA: Registry = { url: exampleRegistryUrl, auth: null };

    const exampleRegistryB: Registry = { url: unityRegistryUrl, auth: null };

    it("should return null if not given any sources", async () => {
      const sources = Array.of<Registry>();

      const actual = await queryAllRegistriesLazy(sources, async () => 1);

      expect(actual).toBeNull();
    });

    it("should return null if no source matched the query", async () => {
      const sources = [exampleRegistryA, exampleRegistryB];

      const actual = await queryAllRegistriesLazy(sources, async () => null);

      expect(actual).toBeNull();
    });

    it("should throw first encountered error", async () => {
      const sources = [exampleRegistryA, exampleRegistryB];

      await expect(
        queryAllRegistriesLazy(sources, (source) => {
          throw { source: source.url };
        })
      ).rejects.toEqual({ source: exampleRegistryA.url });
    });

    it("should stop query when encountering an error", async () => {
      const sources = [exampleRegistryA, exampleRegistryB];
      const fn = jest.fn();

      await queryAllRegistriesLazy(sources, (source) => {
        fn(source.url);
        throw new Error();
      })
        // Empty catch so thrown error does not trigger a failed test
        .catch(() => {});

      expect(fn).not.toHaveBeenCalledWith(exampleRegistryB.url);
    });

    it("should return value from first registry if there is a match", async () => {
      const sources = [exampleRegistryA, exampleRegistryB];

      const actual = await queryAllRegistriesLazy(sources, async () => 1);

      expect(actual).toEqual({ value: 1, source: exampleRegistryA.url });
    });

    it("should return value from fallback registry if there is no match in the first", async () => {
      const sources = [exampleRegistryA, exampleRegistryB];

      const actual = await queryAllRegistriesLazy(sources, async (source) =>
        source.url === exampleRegistryB.url ? 1 : null
      );

      expect(actual).toEqual({ value: 1, source: exampleRegistryB.url });
    });
  });
});
