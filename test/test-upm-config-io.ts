import { describe } from "mocha";
import { runWithEnv } from "./mock-env";
import { getUpmConfigDir } from "../src/utils/upm-config-io";
import should from "should";

describe("upm-config-io", function () {
  describe("get directory", function () {
    describe("no wsl and no system-user", function () {
      it("should be USERPROFILE if defined", async function () {
        const expected = "user/dir";

        const actual = await runWithEnv(
          {
            USERPROFILE: expected,
          },
          () => getUpmConfigDir(false, false)
        );

        should(actual).be.equal(expected);
      });
      it("should be HOME if defined and USERPROFILE is undefined", async function () {
        const expected = "user/dir";

        const actual = await runWithEnv(
          {
            HOME: expected,
          },
          () => getUpmConfigDir(false, false)
        );

        should(actual).be.equal(expected);
      });
      it("should fail if HOME and USERPROFILE and undefined", async function () {
        await should(
          runWithEnv({}, () => getUpmConfigDir(false, false))
        ).rejected();
      });
    });
  });
});
