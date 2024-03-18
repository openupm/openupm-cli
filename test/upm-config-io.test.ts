import { runWithEnv } from "./mock-env";
import {
  RequiredEnvMissingError,
  tryGetUpmConfigDir,
} from "../src/utils/upm-config-io";

describe("upm-config-io", function () {
  describe("get directory", function () {
    describe("no wsl and no system-user", function () {
      it("should be USERPROFILE if defined", async function () {
        const expected = "user/dir";

        const result = await runWithEnv(
          {
            USERPROFILE: expected,
          },
          () => tryGetUpmConfigDir(false, false).promise
        );

        expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
      });
      it("should be HOME if defined and USERPROFILE is undefined", async function () {
        const expected = "user/dir";

        const result = await runWithEnv(
          {
            HOME: expected,
          },
          () => tryGetUpmConfigDir(false, false).promise
        );

        expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
      });
      it("should fail if HOME and USERPROFILE and undefined", async function () {
        const result = await runWithEnv(
          {},
          () => tryGetUpmConfigDir(false, false).promise
        );

        expect(result).toBeError((error) =>
          expect(error).toBeInstanceOf(RequiredEnvMissingError)
        );
      });
    });
  });
});
