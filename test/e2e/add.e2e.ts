import { prepareHomeDirectory } from "./setup/directories";
import { runOpenupm } from "./run";
import { prepareUnityProject } from "./setup/project";
import { makeDomainName } from "../../src/domain/domain-name";
import { ResultCodes } from "../../src/cli/result-codes";

describe("add packages", () => {
  it("should add remote package without specified version", async () => {
    const packageName = makeDomainName(
      "dev.comradevanti.totask.asyncoperation"
    );
    const homeDir = await prepareHomeDirectory();
    const projectDir = await prepareUnityProject(homeDir);

    const output = await runOpenupm(projectDir, ["add", packageName]);

    expect(output.code).toEqual(ResultCodes.Ok);
  });
});
