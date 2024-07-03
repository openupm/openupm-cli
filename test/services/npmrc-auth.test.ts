import { FindNpmrcPath, LoadNpmrc, SaveNpmrc } from "../../src/io/npmrc-io";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { RequiredEnvMissingError } from "../../src/io/upm-config-io";
import { emptyNpmrc, setToken } from "../../src/domain/npmrc";
import { exampleRegistryUrl } from "../domain/data-registry";
import { makeAuthNpmrc } from "../../src/services/npmrc-auth";
import { mockService } from "./service.mock";

const exampleNpmrcPath = "/users/someuser/.npmrc";

function makeDependencies() {
  const findPath = mockService<FindNpmrcPath>();
  findPath.mockReturnValue(Ok(exampleNpmrcPath));

  const loadNpmrc = mockService<LoadNpmrc>();
  loadNpmrc.mockReturnValue(new AsyncResult(Ok(null)));

  const saveNpmrc = mockService<SaveNpmrc>();
  saveNpmrc.mockReturnValue(new AsyncResult(Ok(undefined)));

  const authNpmrc = makeAuthNpmrc(findPath, loadNpmrc, saveNpmrc);
  return { authNpmrc, findPath, loadNpmrc, saveNpmrc } as const;
}

describe("npmrc-auth", () => {
  describe("set token", () => {
    it("should fail if path could not be determined", async () => {
      const expected = new RequiredEnvMissingError([]);
      const { authNpmrc, findPath } = makeDependencies();
      findPath.mockReturnValue(Err(expected));

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
      const { authNpmrc, saveNpmrc } = makeDependencies();

      await authNpmrc(exampleRegistryUrl, "some token").promise;

      expect(saveNpmrc).toHaveBeenCalledWith(exampleNpmrcPath, expected);
    });

    it("should update npmrc if already exists", async () => {
      const { authNpmrc, loadNpmrc, saveNpmrc } = makeDependencies();
      const initial = setToken(
        emptyNpmrc,
        exampleRegistryUrl,
        "some old token"
      );
      const expected = setToken(initial, exampleRegistryUrl, "some token");
      loadNpmrc.mockReturnValue(new AsyncResult(Ok(initial)));

      await authNpmrc(exampleRegistryUrl, "some token").promise;

      expect(saveNpmrc).toHaveBeenCalledWith(exampleNpmrcPath, expected);
    });
  });
});
