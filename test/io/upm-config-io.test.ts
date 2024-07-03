import {
  makeGetUpmConfigPath,
  makeLoadUpmConfig,
} from "../../src/io/upm-config-io";
import { ReadTextFile } from "../../src/io/text-file-io";
import { mockService } from "../services/service.mock";
import { StringFormatError } from "../../src/utils/string-parsing";
import { GetHomePath } from "../../src/io/special-paths";
import path from "path";
import { GenericIOError } from "../../src/io/common-errors";
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

        const result = await getUpmConfigPath(false, false).promise;

        expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
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

      const result = await loadUpmConfig(path).promise;

      expect(result).toBeOk((actual) => expect(actual).toBeNull());
    });

    it("should be parsed file", async () => {
      const { loadUpmConfig } = makeDependencies();
      const path = "/home/user/.upmconfig.toml";

      const result = await loadUpmConfig(path).promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual({}));
    });

    it("should fail if file could not be read", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      const path = "/home/user/.upmconfig.toml";
      readFile.mockRejectedValue(new GenericIOError("Read"));

      const result = await loadUpmConfig(path).promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(GenericIOError)
      );
    });

    it("should fail if file has bad toml content", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      readFile.mockResolvedValue("This {\n is not]\n valid TOML");
      const path = "/home/user/.upmconfig.toml";

      await expect(loadUpmConfig(path).promise).rejects.toBeInstanceOf(
        StringFormatError
      );
    });
  });
});
