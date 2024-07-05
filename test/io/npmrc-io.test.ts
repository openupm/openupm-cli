import { ReadTextFile, WriteTextFile } from "../../src/io/text-file-io";
import { EOL } from "node:os";
import {
  makeFindNpmrcPath,
  makeLoadNpmrc,
  makeSaveNpmrc,
} from "../../src/io/npmrc-io";
import path from "path";
import { GetHomePath } from "../../src/io/special-paths";
import { mockService } from "../services/service.mock";

describe("npmrc-io", () => {
  describe("get path", () => {
    function makeDependencies() {
      const getHomePath = mockService<GetHomePath>();

      const findPath = makeFindNpmrcPath(getHomePath);

      return { findPath, getHomePath } as const;
    }

    it("should be [Home]/.npmrc", () => {
      const { findPath, getHomePath } = makeDependencies();
      const home = path.join(path.sep, "user", "dir");
      const expected = path.join(home, ".npmrc");
      getHomePath.mockReturnValue(home);

      const actual = findPath();

      expect(actual).toEqual(expected);
    });
  });

  describe("load", () => {
    function makeDependencies() {
      const readText = mockService<ReadTextFile>();

      const loadNpmrc = makeLoadNpmrc(readText);
      return { loadNpmrc, readText } as const;
    }

    it("should be ok for valid file", async () => {
      const fileContent = `key1 = value1${EOL}key2 = "value2"`;
      const { loadNpmrc, readText } = makeDependencies();
      readText.mockResolvedValue(fileContent);

      const actual = await loadNpmrc("/valid/path/.npmrc");

      expect(actual).toEqual(["key1 = value1", 'key2 = "value2"']);
    });

    it("should be null for missing file", async () => {
      const { loadNpmrc, readText } = makeDependencies();
      const path = "/invalid/path/.npmrc";
      readText.mockResolvedValue(null);

      const actual = await loadNpmrc(path);

      expect(actual).toBeNull();
    });
  });

  describe("save", () => {
    function makeDependencies() {
      const writeFile = mockService<WriteTextFile>();
      writeFile.mockResolvedValue(undefined);

      const saveNpmrc = makeSaveNpmrc(writeFile);
      return { saveNpmrc, writeFile } as const;
    }

    it("should write joined lines", async () => {
      const { saveNpmrc, writeFile } = makeDependencies();
      const path = "/valid/path/.npmrc";

      await saveNpmrc(path, ["key=value", "key2=value2"]);

      expect(writeFile).toHaveBeenCalledWith(
        path,
        `key=value${EOL}key2=value2`
      );
    });
  });
});
