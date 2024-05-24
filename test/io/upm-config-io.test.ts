import {
  makeUpmConfigLoader,
  makeUpmConfigPathGetter,
  RequiredEnvMissingError,
} from "../../src/io/upm-config-io";
import { Err, Ok } from "ts-results-es";
import { FsError, FsErrorReason, ReadTextFile } from "../../src/io/file-io";
import { mockService } from "../services/service.mock";
import { StringFormatError } from "../../src/utils/string-parsing";
import { GetHomePath } from "../../src/io/special-paths";
import path from "path";

describe("upm-config-io", () => {
  describe("get path", () => {
    function makeDependencies() {
      const getHomePath = mockService<GetHomePath>();

      const getUpmConfigPath = makeUpmConfigPathGetter(getHomePath);

      return { getUpmConfigPath, getHomePath } as const;
    }

    describe("no wsl and no system-user", () => {
      it("should be in home path", async () => {
        const { getUpmConfigPath, getHomePath } = makeDependencies();
        const expected = "/some/home/dir/.upmconfig.toml";
        getHomePath.mockReturnValue(Ok(path.dirname(expected)));

        const result = await getUpmConfigPath(false, false).promise;

        expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
      });

      it("should fail if home could not be determined", async () => {
        const { getUpmConfigPath, getHomePath } = makeDependencies();
        const expected = new RequiredEnvMissingError();
        getHomePath.mockReturnValue(Err(expected));

        const result = await getUpmConfigPath(false, false).promise;

        expect(result).toBeError((actual) => expect(actual).toEqual(expected));
      });
    });
  });

  describe("load", () => {
    function makeDependencies() {
      const readFile = mockService<ReadTextFile>();
      readFile.mockReturnValue(Ok("").toAsyncResult());

      const loadUpmConfig = makeUpmConfigLoader(readFile);
      return { loadUpmConfig, readFile } as const;
    }

    it("should be null if file is not found", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      const path = "/home/user/.upmconfig.toml";
      readFile.mockReturnValue(
        Err(new FsError(path, FsErrorReason.Missing)).toAsyncResult()
      );

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
      const expected = new FsError(path, FsErrorReason.Other);
      readFile.mockReturnValue(Err(expected).toAsyncResult());

      const result = await loadUpmConfig(path).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if file has bad toml content", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      readFile.mockReturnValue(
        Ok("This {\n is not]\n valid TOML").toAsyncResult()
      );
      const path = "/home/user/.upmconfig.toml";

      const result = await loadUpmConfig(path).promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(StringFormatError)
      );
    });
  });
});
