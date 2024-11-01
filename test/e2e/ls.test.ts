import { ResultCodes } from "../../src/cli/result-codes.js";
import { buildProjectManifest } from "../common/data-project-manifest.js";
import { runOpenupm } from "./run.js";
import { prepareHomeDirectory } from "./setup/directories.js";
import { prepareUnityProject } from "./setup/project.js";

describe("list installed packages", () => {
  test("should list installed packages", async () => {
    const homeDirectory = await prepareHomeDirectory();
    const projectDirectory = await prepareUnityProject(homeDirectory, {
      manifest: buildProjectManifest((manifest) =>
        manifest
          .addDependency("dev.comradevanti.opt-unity", "2.0.0", true, true)
          .addDependency("com.unity.ugui", "1.0.0", true, false)
      ),
    });

    const result = await runOpenupm(projectDirectory, ["ls"]);

    expect(result.code).toEqual(ResultCodes.Ok);
    expect(result.stdErr).toEqual(
      expect.arrayContaining([
        expect.stringContaining("dev.comradevanti.opt-unity@2.0.0"),
        expect.stringContaining("com.unity.ugui@1.0.0"),
      ])
    );
  });
});
