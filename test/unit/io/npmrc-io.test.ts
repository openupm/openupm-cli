import { EOL } from "node:os";
import path from "path";
import {
  FindNpmrcInHome,
  ReadNpmrcFile,
  WriteNpmrcPath as WriteNpmrcFile,
} from "../../../src/io/npmrc-io";
import { ReadTextFile, WriteTextFile } from "../../../src/io/text-file-io";
import { mockService } from "../services/service.mock";

describe("npmrc-io", () => {
  describe("find path in home", () => {
    const someHomePath = path.join(path.sep, "user", "dir");

    function makeDependencies() {
      const findNpmrcInHome = FindNpmrcInHome(someHomePath);

      return { findNpmrcInHome } as const;
    }

    it("should be [Home]/.npmrc", () => {
      const { findNpmrcInHome } = makeDependencies();
      const expected = path.join(someHomePath, ".npmrc");

      const actual = findNpmrcInHome();

      expect(actual).toEqual(expected);
    });
  });

  describe("read file", () => {
    function makeDependencies() {
      const readText = mockService<ReadTextFile>();

      const readNpmrcFile = ReadNpmrcFile(readText);
      return { readNpmrcFile, readText } as const;
    }

    it("should be ok for valid file", async () => {
      const fileContent = `key1 = value1${EOL}key2 = "value2"`;
      const { readNpmrcFile, readText } = makeDependencies();
      readText.mockResolvedValue(fileContent);

      const actual = await readNpmrcFile("/valid/path/.npmrc");

      expect(actual).toEqual(["key1 = value1", 'key2 = "value2"']);
    });

    it("should be null for missing file", async () => {
      const { readNpmrcFile, readText } = makeDependencies();
      const path = "/invalid/path/.npmrc";
      readText.mockResolvedValue(null);

      const actual = await readNpmrcFile(path);

      expect(actual).toBeNull();
    });
  });

  describe("write file", () => {
    function makeDependencies() {
      const writeFile = mockService<WriteTextFile>();
      writeFile.mockResolvedValue(undefined);

      const writeNpmrcFile = WriteNpmrcFile(writeFile);
      return { writeNpmrcFile, writeFile } as const;
    }

    it("should write joined lines", async () => {
      const { writeNpmrcFile, writeFile } = makeDependencies();
      const path = "/valid/path/.npmrc";

      await writeNpmrcFile(path, ["key=value", "key2=value2"]);

      expect(writeFile).toHaveBeenCalledWith(
        path,
        `key=value${EOL}key2=value2`
      );
    });
  });
});
