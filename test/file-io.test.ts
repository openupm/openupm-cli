import fs from "fs/promises";
import {
  IOError,
  NotFoundError,
  tryGetDirectoriesIn,
  tryReadTextFromFile,
  tryWriteTextToFile,
} from "../src/io/file-io";
import fse from "fs-extra";
import { Dirent } from "node:fs";

function makeNodeError(code: string): NodeJS.ErrnoException {
  const error = new Error() as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

describe("file-io", () => {
  describe("read text", () => {
    it("should produce text if file can be read", async () => {
      const expected = "content";
      jest.spyOn(fs, "readFile").mockResolvedValue(expected);

      const result = await tryReadTextFromFile("path/to/file.txt").promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should notify of missing file", async () => {
      jest.spyOn(fs, "readFile").mockRejectedValue(makeNodeError("ENOENT"));

      const result = await tryReadTextFromFile("path/to/file.txt").promise;

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(NotFoundError)
      );
    });

    it("should notify of other errors", async () => {
      // Example of a code we don't handle in a special way.
      jest.spyOn(fs, "readFile").mockRejectedValue(makeNodeError("EACCES"));

      const result = await tryReadTextFromFile("path/to/file.txt").promise;

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(IOError)
      );
    });
  });

  describe("write text", () => {
    beforeEach(() => {
      jest.spyOn(fse, "ensureDir").mockResolvedValue(undefined!);
      jest.spyOn(fs, "writeFile").mockResolvedValue(undefined);
    });

    it("should be ok for valid write", async () => {
      const result = await tryWriteTextToFile("path/to/file.txt", "content")
        .promise;

      expect(result).toBeOk();
    });

    it("should write to correct path", async () => {
      const expected = "path/to/file.txt";
      const fsWrite = jest.spyOn(fs, "writeFile");

      await tryWriteTextToFile(expected, "content").promise;

      expect(fsWrite).toHaveBeenCalledWith(expected, expect.any(String));
    });

    it("should write text to file", async () => {
      const expected = "content";
      const fsWrite = jest.spyOn(fs, "writeFile");

      await tryWriteTextToFile("path/to/file.txt", expected).promise;

      expect(fsWrite).toHaveBeenCalledWith(expect.any(String), expected);
    });

    it("should ensure directory exists", async () => {
      const fseEnsureDir = jest.spyOn(fse, "ensureDir");

      await tryWriteTextToFile("/path/to/file.txt", "content").promise;

      expect(fseEnsureDir).toHaveBeenCalledWith("/path/to");
    });

    it("should notify of directory ensure error", async () => {
      jest
        .spyOn(fse, "ensureDir")
        .mockRejectedValue(makeNodeError("EACCES") as never);

      const result = await tryWriteTextToFile("/path/to/file.txt", "content")
        .promise;

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(IOError)
      );
    });

    it("should notify of write error", async () => {
      jest
        .spyOn(fs, "writeFile")
        .mockRejectedValue(makeNodeError("EACCES") as never);

      const result = await tryWriteTextToFile("/path/to/file.txt", "content")
        .promise;

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(IOError)
      );
    });
  });

  describe("get directories", () => {
    it("should fail if directory does not exist", async () => {
      jest.spyOn(fs, "readdir").mockRejectedValue(makeNodeError("ENOENT"));

      const result = await tryGetDirectoriesIn("/bad/path/").promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(NotFoundError)
      );
    });

    it("should fail if directory could not be read", async () => {
      jest.spyOn(fs, "readdir").mockRejectedValue(makeNodeError("EACCES"));

      const result = await tryGetDirectoriesIn("/good/path/").promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(IOError)
      );
    });

    it("should get names of directories", async () => {
      jest
        .spyOn(fs, "readdir")
        .mockResolvedValue([
          { name: "a", isDirectory: () => true } as Dirent,
          { name: "b", isDirectory: () => true } as Dirent,
        ]);

      const result = await tryGetDirectoriesIn("/good/path/").promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(["a", "b"]));
    });

    it("should get only directories", async () => {
      jest
        .spyOn(fs, "readdir")
        .mockResolvedValue([
          { name: "a", isDirectory: () => true } as Dirent,
          { name: "b.txt", isDirectory: () => false } as Dirent,
        ]);

      const result = await tryGetDirectoriesIn("/good/path/").promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(["a"]));
    });
  });
});
