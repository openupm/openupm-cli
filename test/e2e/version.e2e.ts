import { runOpenupm } from "./common";
import pkgJson from "../../package.json";

describe("version", () => {
  it("should print current version", async () => {
    const output = await runOpenupm(["--version"]);

    expect(output.stdOut).toEqual(
      expect.arrayContaining([expect.stringContaining(pkgJson.version)])
    );
  });

  it("should exit with 0", async () => {
    const output = await runOpenupm(["--version"]);

    expect(output.code).toEqual(0);
  });
});
