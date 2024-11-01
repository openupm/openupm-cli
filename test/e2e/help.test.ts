import { runOpenupm } from "./run.js";
import { prepareHomeDirectory } from "./setup/directories.js";

describe("help", () => {
  it("should show help when running with no commands", async () => {
    const homeDir = await prepareHomeDirectory();
    const output = await runOpenupm(homeDir, []);

    expect(output.stdErr).toEqual(
      expect.arrayContaining([expect.stringContaining("Usage")])
    );
  });

  it("should exit with 0", async () => {
    const homeDir = await prepareHomeDirectory();
    const output = await runOpenupm(homeDir, []);

    expect(output.code).toEqual(1);
  });
});
