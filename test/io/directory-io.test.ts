import { makeNodeError } from "./node-error.mock";
import fs from "fs/promises";
import { tryGetDirectoriesIn } from "../../src/io/directory-io";
import { noopLogger } from "../../src/logging";
import { Dirent } from "node:fs";

describe("directory io", () => {
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
