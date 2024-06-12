import { prepareHomeDirectory } from "./setup/directories";
import { runOpenupm } from "./run";
import { prepareUnityProject } from "./setup/project";
import { ResultCodes } from "../../src/cli/result-codes";
import { getProjectManifest } from "./check/project-manifest";

describe("add packages", () => {
  async function testAddSingle(
    packageName: string,
    addVersion: string | undefined,
    expectedVersion: string
  ) {
    const homeDir = await prepareHomeDirectory();
    const projectDir = await prepareUnityProject(homeDir);

    const output = await runOpenupm(
      projectDir,
      addVersion !== undefined
        ? ["add", packageName, addVersion]
        : ["add", packageName]
    );
    const projectManifest = await getProjectManifest(projectDir);

    expect(output.code).toEqual(ResultCodes.Ok);
    expect(projectManifest).toEqual(
      expect.objectContaining({
        dependencies: {
          [packageName]: expectedVersion,
        },
        scopedRegistries: [
          {
            name: "package.openupm.com",
            url: "https://package.openupm.com",
            scopes: [packageName],
          },
        ],
      })
    );
    expect(output.stdOut).toEqual([]);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`added ${packageName}@${expectedVersion}`),
        expect.stringContaining("please open Unity project to apply changes"),
      ])
    );
  }

  it("should add remote package without specified version", async () => {
    await testAddSingle(
      "dev.comradevanti.totask.asyncoperation",
      undefined,
      "2.0.1"
    );
  });

  it("should add remote package with specified version", async () => {
    await testAddSingle(
      "dev.comradevanti.totask.asyncoperation",
      "2.0.1",
      "2.0.1"
    );
  });

  it("should add remote package with latest tag", async () => {
    await testAddSingle(
      "dev.comradevanti.totask.asyncoperation",
      "latest",
      "2.0.1"
    );
  });
});
