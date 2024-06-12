import { prepareHomeDirectory } from "./setup/directories";
import { runOpenupm } from "./run";
import { prepareUnityProject } from "./setup/project";
import { ResultCodes } from "../../src/cli/result-codes";
import { getProjectManifest } from "./check/project-manifest";

describe("add packages", () => {
  type SuccessfullAddCase = {
    packageName: string;
    addVersion?: string;
    expectedVersion: string;
  };

  async function testSuccessfulAdd(...cases: SuccessfullAddCase[]) {
    const homeDir = await prepareHomeDirectory();
    const projectDir = await prepareUnityProject(homeDir);

    const pkgRefs = cases.map((it) =>
      it.addVersion !== undefined
        ? `${it.packageName}@${it.addVersion}`
        : it.packageName
    );
    const output = await runOpenupm(projectDir, ["add", ...pkgRefs]);
    const projectManifest = await getProjectManifest(projectDir);

    expect(output.code).toEqual(ResultCodes.Ok);
    expect(projectManifest).toEqual(
      expect.objectContaining({
        dependencies: Object.fromEntries(
          cases.map((it) => [it.packageName, it.expectedVersion])
        ),
        scopedRegistries: [
          {
            name: "package.openupm.com",
            url: "https://package.openupm.com",
            scopes: cases.map((it) => it.packageName),
          },
        ],
      })
    );
    expect(output.stdOut).toEqual([]);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([
        ...cases.map((it) =>
          expect.stringContaining(
            `added ${it.packageName}@${it.expectedVersion}`
          )
        ),
        expect.stringContaining("please open Unity project to apply changes"),
      ])
    );
  }

  it("should add remote package without specified version", async () => {
    await testSuccessfulAdd({
      packageName: "dev.comradevanti.totask.asyncoperation",
      expectedVersion: "2.0.1",
    });
  });

  it("should add remote package with specified version", async () => {
    await testSuccessfulAdd({
      packageName: "dev.comradevanti.totask.asyncoperation",
      addVersion: "2.0.1",
      expectedVersion: "2.0.1",
    });
  });

  it("should add remote package with latest tag", async () => {
    await testSuccessfulAdd({
      packageName: "dev.comradevanti.totask.asyncoperation",
      addVersion: "latest",
      expectedVersion: "2.0.1",
    });
  });

  it("should add multiple packages", async () => {
    await testSuccessfulAdd(
      {
        packageName: "dev.comradevanti.totask.asyncoperation",
        addVersion: "latest",
        expectedVersion: "2.0.1",
      },
      {
        packageName: "dev.comradevanti.opt-unity",
        addVersion: "latest",
        expectedVersion: "3.5.0",
      }
    );
  });
});
