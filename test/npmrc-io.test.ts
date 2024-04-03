import {
  NotFoundError,
  tryReadTextFromFile,
  tryWriteTextToFile,
} from "../src/io/file-io";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { EOL } from "node:os";
import {
  tryGetNpmrcPath,
  tryLoadNpmrc,
  trySaveNpmrc,
} from "../src/io/npmrc-io";
import { IOError } from "../src/common-errors";
import path from "path";
import { tryGetEnv } from "../src/utils/env-util";

jest.mock("../src/io/file-io");
jest.mock("../src/utils/env-util");

describe("npmrc-io", () => {
  describe("get path", () => {
    it("should be USERPROFILE if defined", () => {
      const home = path.join(path.sep, "user", "dir");
      const expected = path.join(home, ".npmrc");
      jest
        .mocked(tryGetEnv)
        .mockImplementation((key) => (key === "USERPROFILE" ? home : null));

      const result = tryGetNpmrcPath();

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });
    it("should be HOME if USERPROFILE is not defined", () => {
      const home = path.join(path.sep, "user", "dir");
      const expected = path.join(home, ".npmrc");
      jest
        .mocked(tryGetEnv)
        .mockImplementation((key) => (key === "HOME" ? home : null));

      const result = tryGetNpmrcPath();

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });
    it("should fail if HOME and USERPROFILE are not defined", () => {
      jest.mocked(tryGetEnv).mockReturnValue(null);

      const result = tryGetNpmrcPath();

      expect(result).toBeError();
    });
  });

  describe("load", () => {
    it("should be ok for valid file", async () => {
      const fileContent = `key1 = value1${EOL}key2 = "value2"`;
      jest
        .mocked(tryReadTextFromFile)
        .mockReturnValue(new AsyncResult(Ok(fileContent)));

      const result = await tryLoadNpmrc("/valid/path/.npmrc").promise;

      expect(result).toBeOk((actual) =>
        expect(actual).toEqual(["key1 = value1", 'key2 = "value2"'])
      );
    });

    it("should be null for missing file", async () => {
      const path = "/invalid/path/.npmrc";
      const expected = new NotFoundError(path);
      jest
        .mocked(tryReadTextFromFile)
        .mockReturnValue(new AsyncResult(Err(expected)));

      const result = await tryLoadNpmrc(path).promise;

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
