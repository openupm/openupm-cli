import { runOpenupm } from "./common";

describe("help", () => {
  it("should show help when running with no commands", async () => {
    const output = await runOpenupm([]);

    expect(output.stdErr).toEqual(
      expect.arrayContaining([expect.stringContaining("Usage")])
    );
  });

  it("should exit with 0", async () => {
    const output = await runOpenupm([]);

    expect(output.code).toEqual(1);
  });
});
