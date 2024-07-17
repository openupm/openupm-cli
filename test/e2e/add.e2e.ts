import { prepareHomeDirectory } from "./setup/directories";
import { runOpenupm } from "./run";
import { prepareUnityProject } from "./setup/project";
import { ResultCodes } from "../../src/cli/result-codes";
import { getProjectManifest } from "./check/project-manifest";
import { emptyProjectManifest } from "../../src/domain/project-manifest";
import { makeRegistryUrl, RegistryUrl } from "../../src/domain/registry-url";

describe("add packages", () => {
  type SuccessfullAddCase = {
    packageName: string;
    addVersion?: string;
    expectedVersion?: string;
  };

  async function testSuccessfulAdd(
    cases: SuccessfullAddCase[],
    expectedScopes: string[],
    registryOverride?: RegistryUrl
  ) {
    const homeDir = await prepareHomeDirectory();
    const projectDir = await prepareUnityProject(homeDir);

    const pkgRefs = cases.map((it) =>
      it.addVersion !== undefined
        ? `${it.packageName}@${it.addVersion}`
        : it.packageName
    );
    const output = await runOpenupm(projectDir, [
      "add",
      ...pkgRefs,
      ...(registryOverride !== undefined
        ? [`--registry=${registryOverride}`]
        : []),
    ]);
    const projectManifest = await getProjectManifest(projectDir);

    expect(output.code).toEqual(ResultCodes.Ok);
    expect(projectManifest).toEqual(
      expect.objectContaining({
        dependencies: Object.fromEntries(
          cases.map((it) => [
            it.packageName,
            it.expectedVersion ?? expect.any(String),
          ])
        ),
      })
    );
    if (expectedScopes.length > 0)
      expect(projectManifest).toEqual(
        expect.objectContaining({
          scopedRegistries: [
            {
              name: expect.any(String),
              url: registryOverride ?? "https://package.openupm.com",
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

  it("should add remote unity package", async () => {
    await testSuccessfulAdd(
      [
        {
          packageName: "com.unity.xr.interaction.toolkit",
          expectedVersion: "3.0.3",
          addVersion: "3.0.3",
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
        expect.stringContaining(`Package "does.not.exist" could not be found.`),
      ])
    );
  });

  it("should not add unknown version", async () => {
    const homeDir = await prepareHomeDirectory();
    const projectDir = await prepareUnityProject(homeDir);

    const output = await runOpenupm(projectDir, [
      "add",
      "dev.comradevanti.opt-unity@100.1.1",
    ]);
    const projectManifest = await getProjectManifest(projectDir);

    expect(output.code).toEqual(ResultCodes.Error);
    expect(projectManifest).toEqual(emptyProjectManifest);
    expect(output.stdOut).toEqual([]);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          `Can not add "dev.comradevanti.opt-unity" because version 100.1.1 could not be found in any registry.`
        ),
      ])
    );
  });

  it("should not add syntactically bad package", async () => {
    const homeDir = await prepareHomeDirectory();
    const projectDir = await prepareUnityProject(homeDir);

    const output = await runOpenupm(projectDir, ["add", "1,2,3"]);
    const projectManifest = await getProjectManifest(projectDir);

    expect(output.code).toEqual(ResultCodes.Error);
    expect(projectManifest).toEqual(emptyProjectManifest);
    expect(output.stdOut).toEqual([]);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([
        expect.stringContaining(`"1,2,3" is not a valid package-reference`),
      ])
    );
  });

  it("should add package with built-in dependencies", async () => {
    // See https://github.com/openupm/openupm-cli/issues/155
    await testSuccessfulAdd(
      [
        {
          packageName: "org.khronos.unitygltf",
          expectedVersion: "2.12.0",
          addVersion: "2.12.0",
        },
      ],
      ["org.khronos.unitygltf"]
    );
  });

  it("should add package from upstream if no matching version was found in primary registry", async () => {
    // See https://github.com/openupm/openupm-cli/issues/41
    await testSuccessfulAdd(
      [
        {
          packageName: "jp.keijiro.metamesh",
        },
      ],
      ["jp.keijiro.metamesh"],
      makeRegistryUrl("https://registry.npmjs.com")
    );
  });
});
