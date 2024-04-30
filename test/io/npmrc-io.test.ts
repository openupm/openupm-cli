import {
  IOError,
  NotFoundError,
  ReadTextFile,
  tryWriteTextToFile,
} from "../../src/io/file-io";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { EOL } from "node:os";
import {
  makeNpmrcLoader,
  makeNpmrcPathFinder,
  trySaveNpmrc,
} from "../../src/io/npmrc-io";
import path from "path";
import { tryGetHomePath } from "../../src/io/special-paths";
import { RequiredEnvMissingError } from "../../src/io/upm-config-io";
import { mockService } from "../services/service.mock";

jest.mock("../../src/io/file-io");
jest.mock("../../src/io/special-paths");

describe("npmrc-io", () => {
  describe("get path", () => {
    function makeDependencies() {
      const findPath = makeNpmrcPathFinder();

      return { findPath } as const;
    }

    it("should be [Home]/.npmrc", () => {
      const { findPath } = makeDependencies();
      const home = path.join(path.sep, "user", "dir");
      const expected = path.join(home, ".npmrc");
      jest.mocked(tryGetHomePath).mockReturnValue(Ok(home));

      const result = findPath();

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if home could not be determined", () => {
      const { findPath } = makeDependencies();
      jest
        .mocked(tryGetHomePath)
        .mockReturnValue(Err(new RequiredEnvMissingError()));

      const result = findPath();

      expect(result).toBeError();
    });
  });

  describe("load", () => {
    function makeDependencies() {
      const readText = mockService<ReadTextFile>();

      const loadNpmrc = makeNpmrcLoader(readText);
      return { loadNpmrc, readText } as const;
    }

    it("should be ok for valid file", async () => {
      const fileContent = `key1 = value1${EOL}key2 = "value2"`;
      const { loadNpmrc, readText } = makeDependencies();
      readText.mockReturnValue(new AsyncResult(Ok(fileContent)));

      const result = await loadNpmrc("/valid/path/.npmrc").promise;

      expect(result).toBeOk((actual) =>
        expect(actual).toEqual(["key1 = value1", 'key2 = "value2"'])
      );
    });

    it("should be null for missing file", async () => {
      const { loadNpmrc, readText } = makeDependencies();
      const path = "/invalid/path/.npmrc";
      const expected = new NotFoundError(path);
      readText.mockReturnValue(new AsyncResult(Err(expected)));

      const result = await loadNpmrc(path).promise;

      expect(result).toBeOk((actual) => expect(actual).toBeNull());
    });
  });

  describe("save", () => {
    it("should be ok when write succeeds", async () => {
      const path = "/valid/path/.npmrc";
      jest
        .mocked(tryWriteTextToFile)
        .mockReturnValue(new AsyncResult(Ok(undefined)));

      const result = await trySaveNpmrc(path, ["key=value"]).promise;

      expect(result).toBeOk();
    });

    it("should fail when write fails", async () => {
      const expected = new IOError();
      const path = "/invalid/path/.npmrc";
      jest
        .mocked(tryWriteTextToFile)
        .mockReturnValue(new AsyncResult(Err(expected)));

      const result = await trySaveNpmrc(path, ["key=value"]).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });
  });
});
