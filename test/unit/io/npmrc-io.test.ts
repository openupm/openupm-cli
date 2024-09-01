import { EOL } from "node:os";
import path from "path";
import {
  getHomeNpmrcPath,
  WriteNpmrcPath as WriteNpmrcFile,
} from "../../../src/io/npmrc-io";
import { WriteTextFile } from "../../../src/io/text-file-io";
import { mockFunctionOfType } from "../services/func.mock";

describe("npmrc-io", () => {
  describe("find path in home", () => {
    const someHomePath = path.join(path.sep, "user", "dir");

    it("should be [Home]/.npmrc", () => {
      const expected = path.join(someHomePath, ".npmrc");

      const actual = getHomeNpmrcPath(someHomePath);

      expect(actual).toEqual(expected);
    });
  });

  describe("write file", () => {
    function makeDependencies() {
      const writeFile = mockFunctionOfType<WriteTextFile>();
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
