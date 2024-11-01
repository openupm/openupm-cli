import { ResultCodes } from "../../src/cli/result-codes.js";
import { runOpenupm } from "./run.js";
import { prepareHomeDirectory } from "./setup/directories.js";

describe("cmd-search", () => {
  it("should print packument information", async () => {
    const homeDir = await prepareHomeDirectory();
    const output = await runOpenupm(homeDir, [
      "search",
      "comradevanti.opt-unity",
    ]);

    expect(output.code).toEqual(ResultCodes.Ok);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([
        expect.stringContaining("dev.comradevanti.opt-unity"),
        expect.stringContaining("3.5.0"),
        expect.stringContaining("2023-02-28"),
      ])
    );
  });

  it("should notify of unknown packument", async () => {
    const homeDir = await prepareHomeDirectory();
    const output = await runOpenupm(homeDir, ["search", "pkg-not-exist"]);

    expect(output.code).toEqual(ResultCodes.Ok);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([expect.stringContaining("No matches found")])
    );
  });
});
