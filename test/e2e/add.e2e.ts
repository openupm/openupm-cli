import { prepareHomeDirectory } from "./setup/directories";
import { runOpenupm } from "./run";
import { prepareUnityProject } from "./setup/project";
import { ResultCodes } from "../../src/cli/result-codes";
import { getProjectManifest } from "./check/project-manifest";
import { emptyProjectManifest } from "../../src/domain/project-manifest";

describe("add packages", () => {
  type SuccessfullAddCase = {
    packageName: string;
    addVersion?: string;
    expectedVersion: string;
  };

  async function testSuccessfulAdd(
    cases: SuccessfullAddCase[],
    expectedScopes: string[]
  ) {
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
      })
    );
    if (expectedScopes.length > 0)
      expect(projectManifest).toEqual(
        expect.objectContaining({
          scopedRegistries: [
            {
              name: "package.openupm.com",
              url: "https://package.openupm.com",
              scopes: expect.arrayContaining(expectedScopes),
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
    await testSuccessfulAdd(
      [
        {
          packageName: "dev.comradevanti.totask.asyncoperation",
          expectedVersion: "2.0.1",
        },
      ],
      ["dev.comradevanti.totask.asyncoperation"]
    );
  });

  it("should add remote package with specified version", async () => {
    await testSuccessfulAdd(
      [
        {
          packageName: "dev.comradevanti.totask.asyncoperation",
          addVersion: "2.0.1",
          expectedVersion: "2.0.1",
        },
      ],
      ["dev.comradevanti.totask.asyncoperation"]
    );
  });

  it("should add remote package with latest tag", async () => {
    await testSuccessfulAdd(
      [
        {
          packageName: "dev.comradevanti.totask.asyncoperation",
          addVersion: "latest",
          expectedVersion: "2.0.1",
        },
      ],
      ["dev.comradevanti.totask.asyncoperation"]
    );
  });

  it("should add multiple packages", async () => {
    await testSuccessfulAdd(
      [
        {
          packageName: "dev.comradevanti.totask.asyncoperation",
          addVersion: "latest",
          expectedVersion: "2.0.1",
        },
        {
          packageName: "dev.comradevanti.opt-unity",
          addVersion: "latest",
          expectedVersion: "3.5.0",
        },
      ],
      [
        "dev.comradevanti.totask.asyncoperation",
        "dev.comradevanti.opt-unity",
        "dev.comradevanti.rect-constraints",
        "dev.comradevanti.totask.asyncoperation",
        "org.nuget.comradevanti.csharptools.opt",
      ]
    );
  });

  it("should add local", async () => {
    await testSuccessfulAdd(
      [
        {
          packageName: "dev.comradevanti.totask.asyncoperation",
          expectedVersion: "file://SomePackage/package.json",
          addVersion: "file://SomePackage/package.json",
        },
      ],
      []
    );
  });

  it("should add remote https", async () => {
    await testSuccessfulAdd(
      [
        {
          packageName: "dev.comradevanti.totask.asyncoperation",
          expectedVersion:
            "https://github.com/ComradeVanti/ToTask.AsyncOperation.git",
          addVersion:
            "https://github.com/ComradeVanti/ToTask.AsyncOperation.git",
        },
      ],
      []
    );
  });

  it("should add remote git", async () => {
    await testSuccessfulAdd(
      [
        {
          packageName: "dev.comradevanti.totask.asyncoperation",
          expectedVersion:
            "git@github.com:ComradeVanti/ToTask.AsyncOperation.git",
          addVersion: "git@github.com:ComradeVanti/ToTask.AsyncOperation.git",
        },
      ],
      []
    );
  });

  it("should be atomic", async () => {
    const homeDir = await prepareHomeDirectory();
    const projectDir = await prepareUnityProject(homeDir);

    const output = await runOpenupm(projectDir, [
      "add",
      "dev.comradevanti.opt-unity",
      "does.not.exist",
    ]);
    const projectManifest = await getProjectManifest(projectDir);

    expect(output.code).toEqual(ResultCodes.Error);
    expect(projectManifest).toEqual(emptyProjectManifest);
  });

  it("should not add non-existent", async () => {
    const homeDir = await prepareHomeDirectory();
    const projectDir = await prepareUnityProject(homeDir);

    const output = await runOpenupm(projectDir, [
      "add",
      "does.not.exist@latest",
    ]);
    const projectManifest = await getProjectManifest(projectDir);

    expect(output.code).toEqual(ResultCodes.Error);
    expect(projectManifest).toEqual(emptyProjectManifest);
    expect(output.stdOut).toEqual([]);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `The package "does.not.exist" was not found in any of the provided registries.`
        ),
      ])
    );
  });
});
