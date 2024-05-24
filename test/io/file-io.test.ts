import fs from "fs/promises";
import {
  FsError,
  FsErrorReason,
  makeTextReader,
  makeTextWriter,
  tryGetDirectoriesIn,
} from "../../src/io/file-io";
import fse from "fs-extra";
import { Dirent } from "node:fs";

function makeNodeError(code: string): NodeJS.ErrnoException {
  const error = new Error() as NodeJS.ErrnoException;
  error.code = code;
  return error;
}

describe("file-io", () => {
  describe("read text", () => {
    function makeDependencies() {
      const readFile = makeTextReader();

      return { readFile } as const;
    }

    it("should produce text if file can be read", async () => {
      const { readFile } = makeDependencies();
      const expected = "content";
      jest.spyOn(fs, "readFile").mockResolvedValue(expected);

      const result = await readFile("path/to/file.txt").promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should notify of missing file", async () => {
      const { readFile } = makeDependencies();
      jest.spyOn(fs, "readFile").mockRejectedValue(makeNodeError("ENOENT"));

      const result = await readFile("path/to/file.txt").promise;

      expect(result).toBeError((error: FsError) =>
        expect(error.reason).toEqual(FsErrorReason.Missing)
      );
    });

    it("should notify of other errors", async () => {
      const { readFile } = makeDependencies();
      // Example of a code we don't handle in a special way.
      jest.spyOn(fs, "readFile").mockRejectedValue(makeNodeError("EACCES"));

      const result = await readFile("path/to/file.txt").promise;

      expect(result).toBeError((error: FsError) =>
        expect(error.reason).toEqual(FsErrorReason.Other)
      );
    });
  });

  describe("write text", () => {
    function makeDependencies() {
      const writeFile = makeTextWriter();

      return { writeFile } as const;
    }

    beforeEach(() => {
      jest.spyOn(fse, "ensureDir").mockResolvedValue(undefined!);
      jest.spyOn(fs, "writeFile").mockResolvedValue(undefined);
    });

    it("should be ok for valid write", async () => {
      const { writeFile } = makeDependencies();

      const result = await writeFile("path/to/file.txt", "content").promise;

      expect(result).toBeOk();
    });

    it("should write to correct path", async () => {
      const { writeFile } = makeDependencies();
      const expected = "path/to/file.txt";
      const fsWrite = jest.spyOn(fs, "writeFile");

      await writeFile(expected, "content").promise;

      expect(fsWrite).toHaveBeenCalledWith(expected, expect.any(String));
    });

    it("should write text to file", async () => {
      const { writeFile } = makeDependencies();
      const expected = "content";
      const fsWrite = jest.spyOn(fs, "writeFile");

      await writeFile("path/to/file.txt", expected).promise;

      expect(fsWrite).toHaveBeenCalledWith(expect.any(String), expected);
    });

    it("should ensure directory exists", async () => {
      const { writeFile } = makeDependencies();
      const fseEnsureDir = jest.spyOn(fse, "ensureDir");

      await writeFile("/path/to/file.txt", "content").promise;

      expect(fseEnsureDir).toHaveBeenCalledWith("/path/to");
    });

    it("should notify of directory ensure error", async () => {
      const { writeFile } = makeDependencies();
      jest
        .spyOn(fse, "ensureDir")
        .mockRejectedValue(makeNodeError("EACCES") as never);

      const result = await writeFile("/path/to/file.txt", "content").promise;

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(FsError)
      );
    });

    it("should notify of write error", async () => {
      const { writeFile } = makeDependencies();
      jest
        .spyOn(fs, "writeFile")
        .mockRejectedValue(makeNodeError("EACCES") as never);

      const result = await writeFile("/path/to/file.txt", "content").promise;

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(FsError)
      );
    });
  });

  describe("get directories", () => {
    it("should fail if directory does not exist", async () => {
      jest.spyOn(fs, "readdir").mockRejectedValue(makeNodeError("ENOENT"));

      const result = await tryGetDirectoriesIn("/bad/path/").promise;

      expect(result).toBeError((actual: FsError) =>
        expect(actual.reason).toEqual(FsErrorReason.Missing)
      );
    });

    it("should fail if directory could not be read", async () => {
      jest.spyOn(fs, "readdir").mockRejectedValue(makeNodeError("EACCES"));

      const result = await tryGetDirectoriesIn("/good/path/").promise;

      expect(result).toBeError((actual: FsError) =>
        expect(actual.reason).toEqual(FsErrorReason.Other)
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
