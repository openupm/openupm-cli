import * as processModule from "../src/utils/process";
import { tryGetWslPath } from "../src/io/wls";
import { Err, Ok } from "ts-results-es";

jest.mock("is-wsl", () => ({
  __esModule: true,
  default: true,
}));

describe("wsl", () => {
  describe("get path", () => {
    it("should be result of wslpath command", async () => {
      const expected = "/some/path";
      jest
        .spyOn(processModule, "default")
        .mockReturnValue(Ok(expected).toAsyncResult());

      const result = await tryGetWslPath("SOMEVAR").promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if wslpath fails", async () => {
      jest
        .spyOn(processModule, "default")
        .mockReturnValue(
          Err({ name: "Error", message: "It failed" }).toAsyncResult()
        );

      const result = await tryGetWslPath("SOMEVAR").promise;

      expect(result).toBeError();
    });

    /*
     * Note: Why is there no test establishing when a `NoWslError` is thrown?
     *
     * We use the `is-wsl` module to determine whether we are running in wsl.
     * This module default exports a single boolean constant which tells us
     * whether we are in wsl. Such exports are very difficult to mock per test
     * in jest.
     *
     * At the top of this file we mock the `is-wsl` value to be true for all
     * tests in this file. This is all I figured out how to do. If you find
     * a way to mock the value exported by `is-wsl` on a per-test basis, please
     * add a test establishing that a `NoWslError` is thrown if `is-wsl` is false.
     */
  });
});
