import { NotFoundError, tryReadTextFromFile } from "../src/io/file-io";
import { AsyncResult, Err, Ok } from "ts-results-es";
import { EOL } from "node:os";
import { tryLoadNpmrc } from "../src/io/npmrc-io";

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
});
