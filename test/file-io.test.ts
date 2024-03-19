import fs from "fs/promises";
import {
  NotFoundError,
  tryReadTextFromFile,
  tryWriteTextToFile,
} from "../src/utils/file-io";
import { IOError } from "../src/common-errors";
import fse from "fs-extra";
import mocked = jest.mocked;

jest.mock("fs/promises");
jest.mock("fs-extra");

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

  describe("write text", () => {
    beforeEach(() => {
      mocked(fse.ensureDir).mockResolvedValue(undefined!);
      mocked(fs.writeFile).mockResolvedValue(undefined);
    });

    it("should be ok for valid write", async () => {
      const result = await tryWriteTextToFile("path/to/file.txt", "content")
        .promise;

      expect(result).toBeOk();
    });

    it("should write to correct path", async () => {
      const expected = "path/to/file.txt";
      const fsWrite = jest.mocked(fs.writeFile);

      await tryWriteTextToFile(expected, "content").promise;

      expect(fsWrite).toHaveBeenCalledWith(expected, expect.any(String));
    });

    it("should write text to file", async () => {
      const expected = "content";
      const fsWrite = jest.mocked(fs.writeFile);

      await tryWriteTextToFile("path/to/file.txt", expected).promise;

      expect(fsWrite).toHaveBeenCalledWith(expect.any(String), expected);
    });

    it("should ensure directory exists", async () => {
      const fseEnsureDir = jest.mocked(fse.ensureDir);

      await tryWriteTextToFile("/path/to/file.txt", "content").promise;

      expect(fseEnsureDir).toHaveBeenCalledWith("/path/to");
    });

    it("should notify of directory ensure error", async () => {
      const fseEnsureDir = jest.mocked(fse.ensureDir);
      fseEnsureDir.mockRejectedValue(makeNodeError("EACCES") as never);

      const result = await tryWriteTextToFile("/path/to/file.txt", "content")
        .promise;

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(IOError)
      );
    });

    it("should notify of write error", async () => {
      const fsWrite = jest.mocked(fs.writeFile);
      fsWrite.mockRejectedValue(makeNodeError("EACCES") as never);

      const result = await tryWriteTextToFile("/path/to/file.txt", "content")
        .promise;

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(IOError)
      );
    });
  });
});
