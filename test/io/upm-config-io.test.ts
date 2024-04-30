import {
  makeUpmConfigLoader,
  RequiredEnvMissingError,
  tryGetUpmConfigDir,
} from "../../src/io/upm-config-io";
import { tryGetHomePath } from "../../src/io/special-paths";
import { Err, Ok } from "ts-results-es";
import {
  IOError,
  NotFoundError,
  tryReadTextFromFile,
} from "../../src/io/file-io";
import {
  StringFormatError,
  tryParseToml,
} from "../../src/utils/string-parsing";

jest.mock("../../src/io/file-io");
jest.mock("../../src/io/special-paths");
jest.mock("../../src/utils/string-parsing");

describe("upm-config-io", () => {
  describe("get directory", () => {
    describe("no wsl and no system-user", () => {
      it("should be home path", async () => {
        const expected = "/some/home/dir/";
        jest.mocked(tryGetHomePath).mockReturnValue(Ok(expected));

        const result = await tryGetUpmConfigDir(false, false).promise;

        expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
      });

      it("should fail if home could not be determined", async () => {
        const expected = new RequiredEnvMissingError();
        jest.mocked(tryGetHomePath).mockReturnValue(Err(expected));

        const result = await tryGetUpmConfigDir(false, false).promise;

        expect(result).toBeError((actual) => expect(actual).toEqual(expected));
      });
    });
  });

  describe("load", () => {
    function makeDependencies() {
      const loadUpmConfig = makeUpmConfigLoader();

      return { loadUpmConfig } as const;
    }

    beforeEach(() => {
      jest.mocked(tryReadTextFromFile).mockReturnValue(Ok("").toAsyncResult());
      jest.mocked(tryParseToml).mockReturnValue(Ok({}));
    });

    it("should be null if file is not found", async () => {
      const { loadUpmConfig } = makeDependencies();
      const path = "/home/user";
      jest
        .mocked(tryReadTextFromFile)
        .mockReturnValue(Err(new NotFoundError(path)).toAsyncResult());

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
      const { loadUpmConfig } = makeDependencies();
      const path = "/home/user";
      const expected = new IOError();
      jest
        .mocked(tryReadTextFromFile)
        .mockReturnValue(Err(expected).toAsyncResult());

      const result = await loadUpmConfig(path).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if file has bad toml content", async () => {
      const { loadUpmConfig } = makeDependencies();
      const path = "/home/user";
      const expected = new StringFormatError("Toml", new Error());
      jest.mocked(tryParseToml).mockReturnValue(Err(expected));

      const result = await loadUpmConfig(path).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });
  });
});
