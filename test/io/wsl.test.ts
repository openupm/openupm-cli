import { ChildProcessError, RunChildProcess } from "../../src/io/child-process";
import { tryGetWslPath } from "../../src/io/wsl";
import { AsyncErr, AsyncOk } from "../../src/utils/result-utils";
import { mockService } from "../services/service.mock";

jest.mock("is-wsl", () => ({
  __esModule: true,
  default: true,
}));

describe("wsl", () => {
  describe("get path", () => {
    it("should be result of wslpath command", async () => {
      const expected = "/some/path";
      const runChildProcess = mockService<RunChildProcess>();
      runChildProcess.mockReturnValue(AsyncOk(expected));

      const result = await tryGetWslPath("SOMEVAR", runChildProcess).promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if wslpath fails", async () => {
      const runChildProcess = mockService<RunChildProcess>();
      runChildProcess.mockReturnValue(AsyncErr(new ChildProcessError()));

      const result = await tryGetWslPath("SOMEVAR", runChildProcess).promise;

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
