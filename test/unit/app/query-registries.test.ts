import { queryAllRegistriesLazy } from "../../../src/app/query-registries";
import { Registry } from "../../../src/domain/registry";
import { otherRegistry, someRegistry } from "../../common/data-registry";

describe("sources", () => {
  describe("query registries lazy", () => {
    it("should return null if not given any sources", async () => {
      const sources = Array.of<Registry>();

      const actual = await queryAllRegistriesLazy(sources, async () => 1);

      expect(actual).toBeNull();
    });

    it("should return null if no source matched the query", async () => {
      const sources = [someRegistry, otherRegistry];

      const actual = await queryAllRegistriesLazy(sources, async () => null);

      expect(actual).toBeNull();
    });

    it("should throw first encountered error", async () => {
      const sources = [someRegistry, otherRegistry];

      await expect(
        queryAllRegistriesLazy(sources, (source) => {
          throw { source: source.url };
        })
      ).rejects.toEqual({ source: someRegistry.url });
    });

    it("should stop query when encountering an error", async () => {
      const sources = [someRegistry, otherRegistry];
      const fn = jest.fn();

      await queryAllRegistriesLazy(sources, (source) => {
        fn(source.url);
        throw new Error();
      })
        // Empty catch so thrown error does not trigger a failed test
        .catch(() => {});

      expect(fn).not.toHaveBeenCalledWith(otherRegistry.url);
    });

    it("should return value from first registry if there is a match", async () => {
      const sources = [someRegistry, otherRegistry];

      const actual = await queryAllRegistriesLazy(sources, async () => 1);

      expect(actual).toEqual({ value: 1, source: someRegistry.url });
    });

    it("should return value from fallback registry if there is no match in the first", async () => {
      const sources = [someRegistry, otherRegistry];

      const actual = await queryAllRegistriesLazy(sources, async (source) =>
        source.url === otherRegistry.url ? 1 : null
      );

      expect(actual).toEqual({ value: 1, source: otherRegistry.url });
    });
  });
});
