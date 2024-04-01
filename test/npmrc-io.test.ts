import {
  NotFoundError,
  tryReadTextFromFile,
  tryWriteTextToFile,
} from "../src/io/file-io";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { EOL } from "node:os";
import { tryLoadNpmrc, trySaveNpmrc } from "../src/io/npmrc-io";
import { IOError } from "../src/common-errors";

jest.mock("../src/io/file-io");

describe("npmrc-io", () => {
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

    it("should fail for missing file", async () => {
      const path = "/invalid/path/.npmrc";
      const expected = new NotFoundError(path);
      jest
        .mocked(tryReadTextFromFile)
        .mockReturnValue(new AsyncResult(Err(expected)));

      const result = await tryLoadNpmrc(path).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
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
