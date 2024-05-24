import {
  FsError,
  NotFoundError,
  ReadTextFile,
  WriteTextFile,
} from "../../src/io/file-io";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { EOL } from "node:os";
import {
  makeNpmrcLoader,
  makeNpmrcPathFinder,
  makeNpmrcSaver,
} from "../../src/io/npmrc-io";
import path from "path";
import { GetHomePath } from "../../src/io/special-paths";
import { RequiredEnvMissingError } from "../../src/io/upm-config-io";
import { mockService } from "../services/service.mock";

describe("npmrc-io", () => {
  describe("get path", () => {
    function makeDependencies() {
      const getHomePath = mockService<GetHomePath>();

      const findPath = makeNpmrcPathFinder(getHomePath);

      return { findPath, getHomePath } as const;
    }

    it("should be [Home]/.npmrc", () => {
      const { findPath, getHomePath } = makeDependencies();
      const home = path.join(path.sep, "user", "dir");
      const expected = path.join(home, ".npmrc");
      getHomePath.mockReturnValue(Ok(home));

      const result = findPath();

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if home could not be determined", () => {
      const { findPath, getHomePath } = makeDependencies();
      getHomePath.mockReturnValue(Err(new RequiredEnvMissingError()));

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
    function makeDependencies() {
      const writeFile = mockService<WriteTextFile>();
      writeFile.mockReturnValue(new AsyncResult(Ok(undefined)));

      const saveNpmrc = makeNpmrcSaver(writeFile);
      return { saveNpmrc, writeFile } as const;
    }

    it("should be ok when write succeeds", async () => {
      const { saveNpmrc } = makeDependencies();
      const path = "/valid/path/.npmrc";

      const result = await saveNpmrc(path, ["key=value"]).promise;

      expect(result).toBeOk();
    });

    it("should fail when write fails", async () => {
      const { saveNpmrc, writeFile } = makeDependencies();
      const expected = new FsError();
      const path = "/invalid/path/.npmrc";
      writeFile.mockReturnValue(new AsyncResult(Err(expected)));

      const result = await saveNpmrc(path, ["key=value"]).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });
  });
});
