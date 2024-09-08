import fse from "fs-extra";
import fs from "fs/promises";
import { readTextFile, writeTextFile } from "../../../src/io/text-file-io";
import { makeNodeError } from "./node-error.mock";

describe("text file io", () => {
  describe("read text", () => {
    it("should produce text if file can be read", async () => {
      const expected = "content";
      jest.spyOn(fs, "readFile").mockResolvedValue(expected);

      const actual = await readTextFile("path/to/file.txt");

      expect(actual).toEqual(expected);
    });

    it("should be null if file is missing", async () => {
      jest.spyOn(fs, "readFile").mockRejectedValue(makeNodeError("ENOENT"));

      const content = await readTextFile("path/to/file.txt");

      expect(content).toBeNull();
    });

    it("should fail if file could not be read", async () => {
      const expected = makeNodeError("EACCES");
      jest.spyOn(fs, "readFile").mockRejectedValue(expected);

      await expect(readTextFile("path/to/file.txt")).rejects.toEqual(expected);
    });
  });

  describe("write text", () => {
    beforeEach(() => {
      jest.spyOn(fse, "ensureDir").mockResolvedValue(undefined!);
      jest.spyOn(fs, "writeFile").mockResolvedValue(undefined);
    });

    it("should be ok for valid write", async () => {
      await expect(
        writeTextFile("path/to/file.txt", "content")
      ).resolves.toBeUndefined();
    });

    it("should write to correct path", async () => {
      const expected = "path/to/file.txt";
      const fsWrite = jest.spyOn(fs, "writeFile");

      await writeTextFile(expected, "content");

      expect(fsWrite).toHaveBeenCalledWith(expected, expect.any(String));
    });

    it("should write text to file", async () => {
      const expected = "content";
      const fsWrite = jest.spyOn(fs, "writeFile");

      await writeTextFile("path/to/file.txt", expected);

      expect(fsWrite).toHaveBeenCalledWith(expect.any(String), expected);
    });

    it("should ensure directory exists", async () => {
      const fseEnsureDir = jest.spyOn(fse, "ensureDir");

      await writeTextFile("/path/to/file.txt", "content");

      expect(fseEnsureDir).toHaveBeenCalledWith("/path/to");
    });

    it("should fail if directory could not be ensured", async () => {
      const expected = makeNodeError("EACCES");
      jest.spyOn(fse, "ensureDir").mockRejectedValue(expected as never);

      await expect(
        writeTextFile("/path/to/file.txt", "content")
      ).rejects.toEqual(expected);
    });

    it("should fail if file could not be written", async () => {
      const expected = makeNodeError("EACCES");
      jest.spyOn(fs, "writeFile").mockRejectedValue(expected as never);

      await expect(
        writeTextFile("/path/to/file.txt", "content")
      ).rejects.toEqual(expected);
    });
  });
});
