import fs from "fs/promises";
import { Dirent } from "node:fs";
import { getDirectoriesInFs } from "../../../src/io/directory-io";
import { makeNodeError } from "./node-error.mock";

describe("directory io", () => {
  describe("get directories", () => {
    function makeDependencies() {
      const getDirectoriesIn = getDirectoriesInFs;
      return { getDirectoriesIn } as const;
    }

    it("should fail if directory could not be read", async () => {
      const expected = makeNodeError("EACCES");
      const { getDirectoriesIn } = makeDependencies();
      jest.spyOn(fs, "readdir").mockRejectedValue(expected);

      await expect(getDirectoriesIn("/good/path/")).rejects.toEqual(expected);
    });

    it("should get names of directories", async () => {
      jest
        .spyOn(fs, "readdir")
        .mockResolvedValue([
          { name: "a", isDirectory: () => true } as Dirent,
          { name: "b", isDirectory: () => true } as Dirent,
        ]);
      const { getDirectoriesIn } = makeDependencies();

      const actual = await getDirectoriesIn("/good/path/");

      expect(actual).toEqual(["a", "b"]);
    });

    it("should get only directories", async () => {
      jest
        .spyOn(fs, "readdir")
        .mockResolvedValue([
          { name: "a", isDirectory: () => true } as Dirent,
          { name: "b.txt", isDirectory: () => false } as Dirent,
        ]);
      const { getDirectoriesIn } = makeDependencies();

      const actual = await getDirectoriesIn("/good/path/");

      expect(actual).toEqual(["a"]);
    });
  });
});
