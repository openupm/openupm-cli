import {
  emptyProjectManifest,
  UnityProjectManifest,
} from "../../src/types/project-manifest";
import path from "path";
import os from "os";
import fse from "fs-extra";
import {
  loadProjectManifest,
  saveProjectManifest,
} from "../../src/utils/project-manifest-io";
import assert from "assert";
import { createProjectVersionTxt } from "../mock-work-dir";

/**
 * A mock Unity project for testing
 */
export type MockUnityProject = {
  /**
   * Attempts to load the project manifest for the project.
   * Null if not found.
   */
  tryGetManifest(): UnityProjectManifest | null;

  /**
   * Runs an assertion function on the project manifest.
   * @param assertFn An assertion function.
   * @throws AssertionError if no manifest was found.
   */
  tryAssertManifest(assertFn: (manifest: UnityProjectManifest) => void): void;

  /**
   * Resets the mock-project to its original state
   */
  reset(): void;

  /**
   * Deletes the mock-project
   */
  restore(): void;
};

const defaultVersion = "2020.2.1f1";

const defaultManifest = emptyProjectManifest();

type Config = {
  /**
   * The version to use for the project.
   * If not specified uses {@link defaultVersion}
   */
  version?: string;
  /**
   * The manifest to use for the project.
   * If not specified uses {@link defaultManifest}.
   * If {@link false} no manifest is created
   */
  manifest?: UnityProjectManifest | false;
};

const rootPath = path.join(os.tmpdir(), "test-openupm-cli");

const projectPath = path.join(rootPath, "Project");

/**
 * Setups a mock Unity project for testing
 * @param config Config describing the project to be setup
 */
export function setupUnityProject(config: Config): MockUnityProject {
  const originalCwd = process.cwd;

  function setup() {
    process.cwd = () => projectPath;
    fse.ensureDirSync(projectPath);

    // Editor-version
    const version = config.version ?? defaultVersion;
    createProjectVersionTxt(projectPath, version);

    // Project manifest
    if (config.manifest !== false) {
      const manifest = config.manifest ?? defaultManifest;
      saveProjectManifest(projectPath, manifest);
    }
  }

  function restore() {
    process.cwd = originalCwd;
    fse.rmSync(rootPath, { recursive: true, force: true });
  }

  function tryGetManifest(): UnityProjectManifest | null {
    return loadProjectManifest(projectPath);
  }

  function tryAssertManifest(
    assertFn: (manifest: UnityProjectManifest) => void
  ) {
    const manifest = tryGetManifest();
    assert(manifest !== null);
    assertFn(manifest);
  }

  function reset() {
    restore();
    setup();
  }

  reset();
  return {
    tryGetManifest,
    tryAssertManifest,
    reset,
    restore,
  };
}
