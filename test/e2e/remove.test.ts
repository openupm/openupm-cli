import { ResultCodes } from "../../src/cli/result-codes.js";
import { emptyProjectManifest } from "../../src/domain/project-manifest.js";
import { buildProjectManifest } from "../common/data-project-manifest.js";
import { someRegistryUrl } from "../common/data-registry.js";
import { getProjectManifest } from "./check/project-manifest.js";
import { runOpenupm } from "./run.js";
import { prepareHomeDirectory } from "./setup/directories.js";
import { prepareUnityProject } from "./setup/project.js";

describe("remove packages", () => {
  it("should not accept package reference with version", async () => {
    const homeDirectory = await prepareHomeDirectory();
    const projectDirectory = await prepareUnityProject(homeDirectory);

    const result = await runOpenupm(projectDirectory, [
      "remove",
      "dev.comradevanti.opt-unity@2.0.0",
    ]);

    expect(result.code).toEqual(ResultCodes.Error);
  });

  it("should remove package from manifest (manifest is empty afterwards)", async () => {
    const homeDirectory = await prepareHomeDirectory();
    const projectDirectory = await prepareUnityProject(homeDirectory, {
      manifest: buildProjectManifest((manifest) =>
        manifest.addDependency(
          "dev.comradevanti.opt-unity",
          "2.0.0",
          true,
          true
        )
      ),
    });

    const result = await runOpenupm(projectDirectory, [
      "remove",
      "dev.comradevanti.opt-unity",
    ]);

    const actualManifest = await getProjectManifest(projectDirectory);
    expect(result.code).toEqual(ResultCodes.Ok);
    expect(result.stdErr).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Removed "dev.comradevanti.opt-unity@2.0.0"'),
        expect.stringContaining("please open Unity"),
      ])
    );
    expect(actualManifest).toEqual(emptyProjectManifest);
  });

  it("should remove package from manifest (other packages remain)", async () => {
    const homeDirectory = await prepareHomeDirectory();
    const projectDirectory = await prepareUnityProject(homeDirectory, {
      manifest: buildProjectManifest((manifest) =>
        manifest
          .addDependency("dev.comradevanti.opt-unity", "2.0.0", true, true)
          .addDependency("some.other.package", "1.0.0", true, false)
      ),
    });

    const result = await runOpenupm(projectDirectory, [
      "remove",
      "dev.comradevanti.opt-unity",
    ]);

    const actualManifest = await getProjectManifest(projectDirectory);
    expect(result.code).toEqual(ResultCodes.Ok);
    expect(result.stdErr).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Removed "dev.comradevanti.opt-unity@2.0.0"'),
        expect.stringContaining("please open Unity"),
      ])
    );
    expect(actualManifest).toEqual({
      dependencies: { "some.other.package": "1.0.0" },
      scopedRegistries: [
        {
          name: expect.any(String),
          url: someRegistryUrl,
          scopes: ["some.other.package"],
        },
      ],
    });
  });

  it("should fail if package is not in manifest", async () => {
    const homeDirectory = await prepareHomeDirectory();
    const projectDirectory = await prepareUnityProject(homeDirectory);

    const result = await runOpenupm(projectDirectory, [
      "remove",
      "dev.comradevanti.opt-unity",
    ]);

    expect(result.code).toEqual(ResultCodes.Error);
    expect(result.stdErr).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          'Package "dev.comradevanti.opt-unity" could not be found'
        ),
        expect.stringContaining("Did you make a typo"),
      ])
    );
  });

  it("should be atomic", async () => {
    const homeDirectory = await prepareHomeDirectory();
    const initialManifest = buildProjectManifest((manifest) =>
      manifest.addDependency("dev.comradevanti.opt-unity", "2.0.0", true, true)
    );
    const projectDirectory = await prepareUnityProject(homeDirectory, {
      manifest: initialManifest,
    });

    const result = await runOpenupm(projectDirectory, [
      "remove",
      "dev.comradevanti.opt-unity",
      "other.unknown.package",
    ]);

    const actualManifest = await getProjectManifest(projectDirectory);
    expect(result.code).toEqual(ResultCodes.Error);
    expect(actualManifest).toEqual(initialManifest);
  });
});
