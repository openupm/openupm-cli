import { runOpenupm } from "./run";
import pkgJson from "../../package.json";
import { prepareHomeDirectory } from "./setup/directories";

describe("version", () => {
  it("should print current version", async () => {
    const homeDir = await prepareHomeDirectory();
    const output = await runOpenupm(homeDir, ["--version"]);

    expect(output.stdOut).toEqual(
      expect.arrayContaining([expect.stringContaining(pkgJson.version)])
    );
  });

  it("should exit with 0", async () => {
    const homeDir = await prepareHomeDirectory();
    const output = await runOpenupm(homeDir, ["--version"]);

    expect(output.code).toEqual(0);
  });
});
