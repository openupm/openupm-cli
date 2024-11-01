import { ResultCodes } from "../../src/cli/result-codes.js";
import { runOpenupm } from "./run.js";
import { prepareHomeDirectory } from "./setup/directories.js";

describe("view packages", () => {
  it("should fail if package version was specified", async () => {
    const homeDir = await prepareHomeDirectory();

    const output = await runOpenupm(homeDir, [
      "view",
      "dev.comradevanti.opt-unity@2.0.0",
    ]);

    expect(output.code).toEqual(ResultCodes.Error);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([
        expect.stringContaining("please do not specify a version"),
      ])
    );
  });

  it("should fail if package is not found", async () => {
    const homeDir = await prepareHomeDirectory();

    const output = await runOpenupm(homeDir, [
      "view",
      "not.existent.package.123456",
    ]);

    expect(output.code).toEqual(ResultCodes.Error);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([expect.stringContaining("could not be found")])
    );
  });

  it("should print package information", async () => {
    const homeDir = await prepareHomeDirectory();

    const output = await runOpenupm(homeDir, [
      "view",
      "dev.comradevanti.opt-unity",
      // We need to disable color, otherwise chalk will mess with the output
      "--no-color"
    ]);

    expect(output.code).toEqual(ResultCodes.Ok);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "dev.comradevanti.opt-unity@3.5.0 | Unlicense | versions: 10"
        ),
      ])
    );
  });
});
