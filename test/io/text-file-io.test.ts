import fs from "fs/promises";
import { makeReadText, makeWriteText } from "../../src/io/text-file-io";
import fse from "fs-extra";
import { noopLogger } from "../../src/logging";
import { makeNodeError } from "./node-error.mock";

describe("text file io", () => {
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

      await expect(
        writeFile("path/to/file.txt", "content")
      ).resolves.toBeUndefined();
    });

    it("should write to correct path", async () => {
      const { writeFile } = makeDependencies();
      const expected = "path/to/file.txt";
      const fsWrite = jest.spyOn(fs, "writeFile");

      await writeFile(expected, "content");

      expect(fsWrite).toHaveBeenCalledWith(expected, expect.any(String));
    });

    it("should write text to file", async () => {
      const { writeFile } = makeDependencies();
      const expected = "content";
      const fsWrite = jest.spyOn(fs, "writeFile");

      await writeFile("path/to/file.txt", expected);

      expect(fsWrite).toHaveBeenCalledWith(expect.any(String), expected);
    });

    it("should ensure directory exists", async () => {
      const { writeFile } = makeDependencies();
      const fseEnsureDir = jest.spyOn(fse, "ensureDir");

      await writeFile("/path/to/file.txt", "content");

      expect(fseEnsureDir).toHaveBeenCalledWith("/path/to");
    });

    it("should fail if directory could not be ensured", async () => {
      const { writeFile } = makeDependencies();
      const expected = makeNodeError("EACCES");
      jest.spyOn(fse, "ensureDir").mockRejectedValue(expected as never);

      await expect(writeFile("/path/to/file.txt", "content")).rejects.toEqual(
        expected
      );
    });

    it("should fail if file could not be written", async () => {
      const { writeFile } = makeDependencies();
      const expected = makeNodeError("EACCES");
      jest.spyOn(fs, "writeFile").mockRejectedValue(expected as never);

      await expect(writeFile("/path/to/file.txt", "content")).rejects.toEqual(
        expected
      );
    });
  });
});
