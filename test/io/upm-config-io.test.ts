import {
  makeUpmConfigDirGetter,
  makeUpmConfigLoader,
  RequiredEnvMissingError,
} from "../../src/io/upm-config-io";
import { Err, Ok } from "ts-results-es";
import { IOError, NotFoundError, ReadTextFile } from "../../src/io/file-io";
import { mockService } from "../services/service.mock";
import { StringFormatError } from "../../src/utils/string-parsing";
import { GetHomePath } from "../../src/io/special-paths";

describe("upm-config-io", () => {
  describe("get directory", () => {
    function makeDependencies() {
      const getHomePath = mockService<GetHomePath>();

      const getUpmConfigDir = makeUpmConfigDirGetter(getHomePath);

      return { getUpmConfigDir, getHomePath } as const;
    }

    describe("no wsl and no system-user", () => {
      it("should be home path", async () => {
        const { getUpmConfigDir, getHomePath } = makeDependencies();
        const expected = "/some/home/dir/";
        getHomePath.mockReturnValue(Ok(expected));

        const result = await getUpmConfigDir(false, false).promise;

        expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
      });

      it("should fail if home could not be determined", async () => {
        const { getUpmConfigDir, getHomePath } = makeDependencies();
        const expected = new RequiredEnvMissingError();
        getHomePath.mockReturnValue(Err(expected));

        const result = await getUpmConfigDir(false, false).promise;

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
      const path = "/home/user";
      readFile.mockReturnValue(Err(new NotFoundError(path)).toAsyncResult());

      const result = await loadUpmConfig(path).promise;

      expect(result).toBeOk((actual) => expect(actual).toBeNull());
    });

    it("should be parsed file", async () => {
      const { loadUpmConfig } = makeDependencies();
      const path = "/home/user";

      const result = await loadUpmConfig(path).promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual({}));
    });

    it("should fail if file could not be read", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      const path = "/home/user";
      const expected = new IOError();
      readFile.mockReturnValue(Err(expected).toAsyncResult());

      const result = await loadUpmConfig(path).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if file has bad toml content", async () => {
      const { loadUpmConfig, readFile } = makeDependencies();
      readFile.mockReturnValue(
        Ok("This {\n is not]\n valid TOML").toAsyncResult()
      );
      const path = "/home/user";

      const result = await loadUpmConfig(path).promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(StringFormatError)
      );
    });
  });
});
