import { runOpenupm } from "./run";
import { prepareHomeDirectory } from "./setup/directories";

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
