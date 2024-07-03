import fs from "fs/promises";
import {
  makeReadText,
  makeWriteText,
  tryGetDirectoriesIn,
} from "../../src/io/fs-result";
import fse from "fs-extra";
import { Dirent } from "node:fs";
import { noopLogger } from "../../src/logging";
import { makeNodeError } from "./node-error.mock";

describe("fs-result", () => {
  describe("read text", () => {
    function makeDependencies() {
      const readFile = makeReadText(noopLogger);

      return { readFile } as const;
    }

    it("should produce text if file can be read", async () => {
      const { readFile } = makeDependencies();
      const expected = "content";
      jest.spyOn(fs, "readFile").mockResolvedValue(expected);

      const actual = await readFile("path/to/file.txt", false);

      expect(actual).toEqual(expected);
    });

    it("should be null if optional file is missing", async () => {
      const { readFile } = makeDependencies();
      jest.spyOn(fs, "readFile").mockRejectedValue(makeNodeError("ENOENT"));

      const content = await readFile("path/to/file.txt", true);

      expect(content).toBeNull();
    });

    it("should fail if non-optional file is missing", async () => {
      const { readFile } = makeDependencies();
      const expected = makeNodeError("ENOENT");
      jest.spyOn(fs, "readFile").mockRejectedValue(expected);

      await expect(readFile("path/to/file.txt", false)).rejects.toEqual(
        expected
      );
    });

    it("should fail if file could not be read", async () => {
      const { readFile } = makeDependencies();
      const expected = makeNodeError("EACCES");
      jest.spyOn(fs, "readFile").mockRejectedValue(expected);

      await expect(readFile("path/to/file.txt", false)).rejects.toEqual(
        expected
      );
    });
  });

  describe("write text", () => {
    function makeDependencies() {
      const writeFile = makeWriteText(noopLogger);

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
      const expected = makeNodeError("EACCES");
      jest.spyOn(fse, "ensureDir").mockRejectedValue(expected as never);

      const result = await writeFile("/path/to/file.txt", "content").promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should notify of write error", async () => {
      const { writeFile } = makeDependencies();
      const expected = makeNodeError("EACCES");
      jest.spyOn(fs, "writeFile").mockRejectedValue(expected as never);

      const result = await writeFile("/path/to/file.txt", "content").promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });
  });

  describe("get directories", () => {
    it("should fail if directory could not be read", async () => {
      const expected = makeNodeError("EACCES");
      jest.spyOn(fs, "readdir").mockRejectedValue(expected);

      const result = await tryGetDirectoriesIn("/good/path/", noopLogger)
        .promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should get names of directories", async () => {
      jest
        .spyOn(fs, "readdir")
        .mockResolvedValue([
          { name: "a", isDirectory: () => true } as Dirent,
          { name: "b", isDirectory: () => true } as Dirent,
        ]);

      const result = await tryGetDirectoriesIn("/good/path/", noopLogger)
        .promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(["a", "b"]));
    });

    it("should get only directories", async () => {
      jest
        .spyOn(fs, "readdir")
        .mockResolvedValue([
          { name: "a", isDirectory: () => true } as Dirent,
          { name: "b.txt", isDirectory: () => false } as Dirent,
        ]);

      const result = await tryGetDirectoriesIn("/good/path/", noopLogger)
        .promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(["a"]));
    });
  });
});
