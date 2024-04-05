import {
  RequiredEnvMissingError,
  tryGetUpmConfigDir,
} from "../src/io/upm-config-io";
import { tryGetHomePath } from "../src/io/home";
import { Err, Ok } from "ts-results-es";

jest.mock("../src/io/home");

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
});
