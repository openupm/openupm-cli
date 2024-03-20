import {
  emptyProjectManifest,
  UnityProjectManifest,
} from "../../src/types/project-manifest";
import path from "path";
import os from "os";
import fse from "fs-extra";
import {
  tryLoadProjectManifest,
  trySaveProjectManifest,
} from "../../src/utils/project-manifest-io";
import { mockEnv, MockEnvSession } from "../mock-env";
import { UPMConfig } from "../../src/types/upm-config";
import { trySaveUpmConfig } from "../../src/utils/upm-config-io";
import { tryCreateProjectVersionTxt } from "../../src/utils/project-version-io";

/**
 * A mock Unity project for testing.
 */
export type MockUnityProject = {
  /**
   * The path to the projects root folder.
   */
  projectPath: string;
  /**
   * Runs an assertion function on the project manifest.
   * @param assertFn An assertion function.
   * @throws AssertionError if no manifest was found.
   */
  tryAssertManifest(
    assertFn: (manifest: UnityProjectManifest) => void
  ): Promise<void>;

  /**
   * Resets the mock-project to its original state.
   */
  reset(): Promise<void>;

  /**
   * Deletes the mock-project.
   */
  restore(): Promise<void>;
};

const defaultVersion = "2020.2.1f1";

const defaultManifest = emptyProjectManifest;

const defaultUpmConfig = {} satisfies UPMConfig;

type Config = {
  /**
   * The version to use for the project.
   * If not specified uses {@link defaultVersion}.
   */
  version?: string;
  /**
   * The manifest to use for the project.
   * If not specified uses {@link defaultManifest}.
   * If {@link false} no manifest is created.
   */
  manifest?: UnityProjectManifest | false;

  /**
   * Override for the generated .upmconfig.toml.
   * If not specified uses {@link defaultUpmConfig}.
   */
  upmConfig?: UPMConfig;
};

export const testRootPath = path.join(os.tmpdir(), "test-openupm-cli");

export const testProjectPath = path.join(testRootPath, "Project");

/**
 * Setups a mock Unity project for testing.
 * This will set up a directory structure with a Unity project, as well
 * as some other effects:
 * - Change {@link process.cwd} to {@link testProjectPath}.
 * - Clear {@link process.env.USERPROFILE}.
 * - Change {@link process.env.HOME} to {@link testRootPath}.
 * - Place a .upmconfig.toml in the root folder of the test directory structure.
 * @param config Config describing the project to be setup.
 */
export async function setupUnityProject(
  config: Config
): Promise<MockUnityProject> {
  let originalCwd: () => string = null!;
  let envSession: MockEnvSession = null!;

  async function setup() {
    originalCwd = process.cwd;
    process.cwd = () => testProjectPath;

    await fse.ensureDir(testProjectPath);

    envSession = mockEnv({ HOME: testRootPath });

    // Upmconfig
    const upmConfig = config.upmConfig ?? defaultUpmConfig;
    const saveResult = await trySaveUpmConfig(upmConfig, testRootPath).promise;
    if (saveResult.isErr()) throw saveResult.error;

    // Editor-version
    const version = config.version ?? defaultVersion;
    const projectVersionResult = await tryCreateProjectVersionTxt(
      testProjectPath,
      version
    ).promise;
    if (projectVersionResult.isErr()) throw projectVersionResult.error;

    // Project manifest
    if (config.manifest !== false) {
      const manifest = config.manifest ?? defaultManifest;
      const manifestResult = await trySaveProjectManifest(
        testProjectPath,
        manifest
      ).promise;
      if (manifestResult.isErr()) throw manifestResult.error;
    }
  }

  async function restore() {
    process.cwd = originalCwd;

    await fse.rm(testRootPath, { recursive: true, force: true });

    envSession?.unhook();
  }

  async function tryAssertManifest(
    assertFn: (manifest: UnityProjectManifest) => void
  ) {
    const manifestResult = await tryLoadProjectManifest(testProjectPath)
      .promise;
    expect(manifestResult).toBeOk((manifest) =>
      assertFn(manifest as UnityProjectManifest)
    );
  }

  async function reset() {
    await restore();
    await setup();
  }

  await setup();
  return {
    projectPath: testProjectPath,
    tryAssertManifest,
    reset,
    restore,
  };
}
