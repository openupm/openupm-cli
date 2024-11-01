import { runOpenupm } from "./run.js";
import { prepareHomeDirectory } from "./setup/directories.js";

describe("unknown command", () => {
  it("should warn of unknown command", async () => {
    const homeDir = await prepareHomeDirectory();
    const output = await runOpenupm(homeDir, ["unknown-command"]);

    expect(output.stdErr).toEqual(
      expect.arrayContaining([expect.stringContaining("unknown command")])
    );
  });

  it("should suggest to run with help", async () => {
    const homeDir = await prepareHomeDirectory();
    const output = await runOpenupm(homeDir, ["unknown-command"]);

    expect(output.stdErr).toEqual(
      expect.arrayContaining([expect.stringContaining("see --help")])
    );
  });

  it("should exit with 1", async () => {
    const homeDir = await prepareHomeDirectory();
    const output = await runOpenupm(homeDir, ["unknown-command"]);

    expect(output.code).toEqual(1);
  });
});
