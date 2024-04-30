import {
  tryGetNpmrcPath,
  tryLoadNpmrc,
  trySaveNpmrc,
} from "../../src/io/npmrc-io";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { RequiredEnvMissingError } from "../../src/io/upm-config-io";
import { emptyNpmrc, setToken } from "../../src/domain/npmrc";
import { exampleRegistryUrl } from "../domain/data-registry";
import { IOError } from "../../src/io/file-io";
import { makeAuthNpmrcService } from "../../src/services/npmrc-auth";

const exampleNpmrcPath = "/users/someuser/.npmrc";

jest.mock("../../src/io/npmrc-io");

function makeDependencies() {
  const authNpmrc = makeAuthNpmrcService();
  return { authNpmrc } as const;
}

describe("npmrc-auth", () => {
  describe("set token", () => {
    beforeEach(() => {
      // Mock defaults
      jest.mocked(tryGetNpmrcPath).mockReturnValue(Ok(exampleNpmrcPath));
      jest.mocked(tryLoadNpmrc).mockReturnValue(new AsyncResult(Ok(null)));
      jest.mocked(trySaveNpmrc).mockReturnValue(new AsyncResult(Ok(undefined)));
    });

    it("should fail if path could not be determined", async () => {
      const expected = new RequiredEnvMissingError();
      const { authNpmrc } = makeDependencies();
      jest.mocked(tryGetNpmrcPath).mockReturnValue(Err(expected));

      const result = await authNpmrc(exampleRegistryUrl, "some token").promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if npmrc load failed", async () => {
      const expected = new IOError();
      const { authNpmrc } = makeDependencies();
      jest.mocked(tryLoadNpmrc).mockReturnValue(new AsyncResult(Err(expected)));

      const result = await authNpmrc(exampleRegistryUrl, "some token").promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if npmrc save failed", async () => {
      const expected = new IOError();
      const { authNpmrc } = makeDependencies();
      jest.mocked(trySaveNpmrc).mockReturnValue(new AsyncResult(Err(expected)));

      const result = await authNpmrc(exampleRegistryUrl, "some token").promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should return npmrc path", async () => {
      const { authNpmrc } = makeDependencies();

      const result = await authNpmrc(exampleRegistryUrl, "some token").promise;

      expect(result).toBeOk((actual) =>
        expect(actual).toEqual(exampleNpmrcPath)
      );
    });

    it("should create npmrc if missing", async () => {
      const expected = setToken(emptyNpmrc, exampleRegistryUrl, "some token");
      const saveSpy = jest.mocked(trySaveNpmrc);
      const { authNpmrc } = makeDependencies();

      await authNpmrc(exampleRegistryUrl, "some token").promise;

      expect(saveSpy).toHaveBeenCalledWith(exampleNpmrcPath, expected);
    });

    it("should update npmrc if already exists", async () => {
      const initial = setToken(
        emptyNpmrc,
        exampleRegistryUrl,
        "some old token"
      );
      const expected = setToken(initial, exampleRegistryUrl, "some token");
      jest.mocked(tryLoadNpmrc).mockReturnValue(new AsyncResult(Ok(initial)));
      const saveSpy = jest.mocked(trySaveNpmrc);
      const { authNpmrc } = makeDependencies();

      await authNpmrc(exampleRegistryUrl, "some token").promise;

      expect(saveSpy).toHaveBeenCalledWith(exampleNpmrcPath, expected);
    });
  });
});
