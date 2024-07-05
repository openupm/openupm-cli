import {
  makeGetUpmConfigPath,
  makeLoadUpmConfig,
} from "../../src/io/upm-config-io";
import { ReadTextFile } from "../../src/io/text-file-io";
import { mockService } from "../services/service.mock";
import { GetHomePath } from "../../src/io/special-paths";
import path from "path";
import { RunChildProcess } from "../../src/io/child-process";

describe("upm-config-io", () => {
  describe("get path", () => {
    function makeDependencies() {
      const getHomePath = mockService<GetHomePath>();

      const runChildProcess = mockService<RunChildProcess>();

      const getUpmConfigPath = makeGetUpmConfigPath(
        getHomePath,
        runChildProcess
      );

      return { getUpmConfigPath, getHomePath } as const;
    }

    describe("no wsl and no system-user", () => {
      it("should be in home path", async () => {
        const { getUpmConfigPath, getHomePath } = makeDependencies();
        const expected = path.resolve("/some/home/dir/.upmconfig.toml");
        getHomePath.mockReturnValue(path.dirname(expected));

        const actual = await getUpmConfigPath(false, false);

        expect(actual).toEqual(expected);
      });
    });
  });

  describe("load", () => {
    function makeDependencies() {
      const readFile = mockService<ReadTextFile>();
      readFile.mockResolvedValue("");

      const loadUpmConfig = makeLoadUpmConfig(readFile);
      return { loadUpmConfig, readFile } as const;
    }

    it("should be null if file is not found", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      const path = "/home/user/.upmconfig.toml";
      readFile.mockResolvedValue(null);

      const actual = await loadUpmConfig(path);

      expect(actual).toBeNull();
    });

    it("should be parsed file", async () => {
      const { loadUpmConfig } = makeDependencies();
      const path = "/home/user/.upmconfig.toml";

      const actual = await loadUpmConfig(path);

      expect(actual).toEqual({});
    });
  });
});
