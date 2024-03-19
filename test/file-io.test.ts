import fs from "fs/promises";
import { NotFoundError, tryReadTextFromFile } from "../src/utils/file-io";
import { IOError } from "../src/common-errors";

jest.mock("fs/promises");

function makeNodeError(code: string): NodeJS.ErrnoException {
  const error = new Error() as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

describe("file-io", () => {
  describe("read text", () => {
    it("should produce text if file can be read", async () => {
      const expected = "content";
      const mockFsRead = jest.mocked(fs.readFile);
      mockFsRead.mockResolvedValue(expected);

      const result = await tryReadTextFromFile("path/to/file.txt").promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should notify of missing file", async () => {
      const mockFsRead = jest.mocked(fs.readFile);
      mockFsRead.mockRejectedValue(makeNodeError("ENOENT"));

      const result = await tryReadTextFromFile("path/to/file.txt").promise;

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(NotFoundError)
      );
    });

    it("should notify of other errors", async () => {
      const mockFsRead = jest.mocked(fs.readFile);
      // Example of a code we don't handle in a special way.
      mockFsRead.mockRejectedValue(makeNodeError("EACCES"));

      const result = await tryReadTextFromFile("path/to/file.txt").promise;

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(IOError)
      );
    });
  });
});
