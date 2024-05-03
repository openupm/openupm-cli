import { runOpenupm } from "./common";

describe("unknown command", () => {
  it("should warn of unknown command", async () => {
    const output = await runOpenupm(["unknown-command"]);

    expect(output.stdErr).toEqual(
      expect.arrayContaining([expect.stringContaining("unknown command")])
    );
  });

  it("should suggest to run with help", async () => {
    const output = await runOpenupm(["unknown-command"]);

    expect(output.stdErr).toEqual(
      expect.arrayContaining([expect.stringContaining("see --help")])
    );
  });

  it("should exit with 1", async () => {
    const output = await runOpenupm(["unknown-command"]);

    expect(output.code).toEqual(1);
  });
});
