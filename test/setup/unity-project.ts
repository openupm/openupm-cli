import {
  emptyProjectManifest,
  UnityProjectManifest,
} from "../../src/types/project-manifest";
import path from "path";
import os from "os";
import fse from "fs-extra";
import {
  tryLoadProjectManifest,
  ManifestLoadResult,
  trySaveProjectManifest,
} from "../../src/utils/project-manifest-io";
import assert from "assert";
import { mockEnv, MockEnvSession } from "../mock-env";
import { UPMConfig } from "../../src/types/upm-config";
import { saveUpmConfig } from "../../src/utils/upm-config-io";
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
   * Attempts to load the project manifest for the project.
   */
  tryGetManifest(): Promise<ManifestLoadResult>;

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

const rootPath = path.join(os.tmpdir(), "test-openupm-cli");

const projectPath = path.join(rootPath, "Project");

/**
 * Setups a mock Unity project for testing.
 * This will set up a directory structure with a Unity project, as well
 * as some other effects:
 * - Change {@link process.cwd} to {@link projectPath}.
 * - Clear {@link process.env.USERPROFILE}.
 * - Change {@link process.env.HOME} to {@link rootPath}.
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
    process.cwd = () => projectPath;

    await fse.ensureDir(projectPath);

    envSession = mockEnv({ HOME: rootPath });

    // Upmconfig
    const upmConfig = config.upmConfig ?? defaultUpmConfig;
    const saveResult = await saveUpmConfig(upmConfig, rootPath);
    if (!saveResult.isOk) throw saveResult.error;

    // Editor-version
    const version = config.version ?? defaultVersion;
    const projectVersionResult = await tryCreateProjectVersionTxt(
      projectPath,
      version
    );
    if (!projectVersionResult.isOk) throw projectVersionResult.error;

    // Project manifest
    if (config.manifest !== false) {
      const manifest = config.manifest ?? defaultManifest;
      const manifestResult = await trySaveProjectManifest(
        projectPath,
        manifest
      );
      if (!manifestResult.isOk) throw manifestResult.error;
    }
  }

  async function restore() {
    process.cwd = originalCwd;

    await fse.rm(rootPath, { recursive: true, force: true });

    envSession?.unhook();
  }

  function tryGetManifest() {
    return tryLoadProjectManifest(projectPath);
  }

  async function tryAssertManifest(
    assertFn: (manifest: UnityProjectManifest) => void
  ) {
    const manifestResult = await tryGetManifest();
    assert(manifestResult.isOk);
    assertFn(manifestResult.value);
  }

  async function reset() {
    await restore();
    await setup();
  }

  await setup();
  return {
    projectPath,
    tryGetManifest,
    tryAssertManifest,
    reset,
    restore,
  };
}
