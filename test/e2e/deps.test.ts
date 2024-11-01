import { ResultCodes } from "../../src/cli/result-codes";
import { runOpenupm } from "./run";
import { prepareHomeDirectory } from "./setup/directories";

describe("print package dependencies", () => {
  it("should print dependencies for an openupm package with version", async () => {
    const homeDir = await prepareHomeDirectory();

    const output = await runOpenupm(homeDir, [
      "deps",
      "dev.comradevanti.opt-unity@2.0.0",
    ]);

    expect(output.code).toEqual(ResultCodes.Ok);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([
        // Taken from https://package.openupm.com/dev.comradevanti.opt-unity
        expect.stringContaining("org.nuget.comradevanti.csharptools.opt@1.1.2"),
      ])
    );
  });

  it("should print dependencies for an openupm package without version (latest)", async () => {
    const homeDir = await prepareHomeDirectory();

    const output = await runOpenupm(homeDir, [
      "deps",
      "dev.comradevanti.opt-unity",
    ]);

    expect(output.code).toEqual(ResultCodes.Ok);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([
        // Taken from https://package.openupm.com/dev.comradevanti.opt-unity
        expect.stringContaining("org.nuget.comradevanti.csharptools.opt@3.0.0"),
        expect.stringContaining("dev.comradevanti.rect-constraints@1.4.1"),
      ])
    );
  });

  it("should print built-in dependencies", async () => {
    // See https://github.com/openupm/openupm-cli/issues/133
    const homeDir = await prepareHomeDirectory();

    const output = await runOpenupm(homeDir, [
      "deps",
      "com.unity.polyspatial@0.7.1",
    ]);

    expect(output.code).toEqual(ResultCodes.Ok);
    expect(output.stdErr).toEqual(
      expect.arrayContaining([
        // Taken from https://packages.unity.com/com.unity.polyspatial
        expect.stringContaining("com.unity.nuget.newtonsoft-json@3.0.2"),
        expect.stringContaining("com.unity.render-pipelines.universal@14.0.1"),
        expect.stringContaining("com.unity.collections@2.1.4"),
        expect.stringContaining("com.unity.textmeshpro@3.0.6"),
        expect.stringContaining("com.unity.xr.core-utils@2.4.0-exp.3"),
        expect.stringContaining("com.unity.ext.flatsharp@0.10.1"),
        expect.stringContaining("com.unity.modules.particlesystem@1.0.0"),
        expect.stringContaining("com.unity.inputsystem@1.4.4"),
        expect.stringContaining("com.unity.modules.video@1.0.0"),
        expect.stringContaining("com.unity.ugui@1.0.0"),
      ])
    );
  });
});
