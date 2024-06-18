import { queryAllRegistriesLazy } from "../../src/utils/sources";
import { AsyncErr, AsyncOk } from "../../src/utils/result-utils";
import { Registry } from "../../src/domain/registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";

describe("sources", () => {
  describe("query registries lazy", () => {
    const exampleRegistryA: Registry = { url: exampleRegistryUrl, auth: null };

    const exampleRegistryB: Registry = { url: unityRegistryUrl, auth: null };

    it("should return null if not given any sources", async () => {
      const sources = Array.of<Registry>();

      const result = await queryAllRegistriesLazy(sources, () => AsyncOk(1))
        .promise;

      expect(result).toBeOk((actual) => expect(actual).toBeNull());
    });

    it("should return null if no source matched the query", async () => {
      const sources = [exampleRegistryA, exampleRegistryB];

      const result = await queryAllRegistriesLazy(sources, () => AsyncOk(null))
        .promise;

      expect(result).toBeOk((actual) => expect(actual).toBeNull());
    });

    it("should return the first encountered error", async () => {
      const sources = [exampleRegistryA, exampleRegistryB];

      const result = await queryAllRegistriesLazy(sources, (source) =>
        AsyncErr({ source: source.url })
      ).promise;

      expect(result).toBeError((actual) =>
        expect(actual).toEqual({ source: exampleRegistryA.url })
      );
    });

    it("should stop query when encountering an error", async () => {
      const sources = [exampleRegistryA, exampleRegistryB];
      const fn = jest.fn();

      await queryAllRegistriesLazy(sources, (source) => {
        fn(source.url);
        return AsyncErr({ source: source.url });
      }).promise;

      expect(fn).not.toHaveBeenCalledWith(exampleRegistryB.url);
    });

    it("should return value from first registry if there is a match", async () => {
      const sources = [exampleRegistryA, exampleRegistryB];

      const result = await queryAllRegistriesLazy(sources, () => AsyncOk(1))
        .promise;

      expect(result).toBeOk((actual) =>
        expect(actual).toEqual({ value: 1, source: exampleRegistryA.url })
      );
    });

    it("should return value from fallback registry if there is no match in the first", async () => {
      const sources = [exampleRegistryA, exampleRegistryB];

      const result = await queryAllRegistriesLazy(sources, (source) =>
        AsyncOk(source.url === exampleRegistryB.url ? 1 : null)
      ).promise;

      expect(result).toBeOk((actual) =>
        expect(actual).toEqual({ value: 1, source: exampleRegistryB.url })
      );
    });
  });
});
