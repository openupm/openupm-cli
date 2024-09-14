import { homedir } from "os";
import path from "path";
import {
  stringifyEditorVersion,
  type ReleaseVersion,
} from "../../src/domain/editor-version";
import {
  emptyProjectManifest,
  manifestPathFor,
  parseProjectManifest,
  serializeProjectManifest,
  type UnityProjectManifest,
} from "../../src/domain/project-manifest";
import { projectVersionTxtPathFor } from "../../src/domain/project-version-txt";
import {
  serializeUpmConfig,
  upmConfigFileName,
  type UpmConfig,
} from "../../src/domain/upm-config";
import type { ReadTextFile, WriteTextFile } from "../../src/io/fs";

type TextFileMap = Record<string, string>;

/**
 * Config options for making a mock Unity project.
 */
export type MockUnityProjectConfig = {
  /**
   * The projects root directory.
   */
  projectDirectory?: string;
  /**
   * The projects manifest. Will be empty if omitted.
   */
  manifest?: UnityProjectManifest;
  /**
   * The editor version for the project. Will be a common lts if omitted.
   */
  projectVersion?: ReleaseVersion | string;
};

/**
 * A fake file-system backed by a mutable in-memory dictionary.
 */
export class MockFs {
  private constructor(private textFiles: TextFileMap) {}

  /**
   * Makes a new empty file-system.
   */
  public static makeEmpty(): MockFs {
    return new MockFs({});
  }

  /**
   * Put a text file into the mock file-system.
   * @param path The file path.
   * @param content The file content.
   * @returns The mock fs, for chaining.
   */
  public putText(path: string, content: string): this {
    this.textFiles = { ...this.textFiles, [path]: content };
    return this;
  }

  /**
   * Attempts to get a text-file from the mock file-system.
   * @param path The path of the file.
   * @returns The file content or null if not found.
   */
  public tryGetText(path: string): string | null {
    return this.textFiles[path] ?? null;
  }

  /**
   * Mocked {@link ReadTextFile} function. Uses the in-memory files.
   */
  public readonly read: ReadTextFile = async (path) => this.tryGetText(path);

  /**
   * Mocked {@link WriteTextFile} function. Uses the in-memory files.
   */
  public readonly write: WriteTextFile = async (path, content) => {
    this.putText(path, content);
  };

  /**
   * Put a project manifest into the mock file-system.
   * @param projectDirectory The Unity project directory.
   * @param manifest The manifest.
   */
  public putProjectManifest(
    projectDirectory: string,
    manifest: UnityProjectManifest
  ): this {
    const manifestPath = manifestPathFor(projectDirectory);
    this.putText(manifestPath, serializeProjectManifest(manifest));
    return this;
  }

  /**
   * Put a project version into the mock file-system.
   * @param projectDirectory The Unity project directory.
   * @param editorVersion The projects editor version.
   */
  public putProjectVersion(
    projectDirectory: string,
    editorVersion: string
  ): this {
    const projectVersionPath = projectVersionTxtPathFor(projectDirectory);
    this.putText(projectVersionPath, `m_EditorVersion: ${editorVersion}`);
    return this;
  }

  /**
   * Put a Unity project into the mock file-system. This will add:
   *  - A project manifest.
   *  - Project version.
   * @param config Configuration options for the project.
   * @returns The mock fs, for chaining.
   */
  public putUnityProject(config?: MockUnityProjectConfig): this {
    const projectDirectory =
      config?.projectDirectory ?? path.join(homedir(), "/projects/SomeProject");

    const manifest = config?.manifest ?? emptyProjectManifest;
    this.putProjectManifest(projectDirectory, manifest);

    const editorVersion =
      config !== undefined && config.projectVersion !== undefined
        ? typeof config.projectVersion === "string"
          ? config.projectVersion
          : stringifyEditorVersion(config.projectVersion)
        : "2022.2.1f2";
    this.putProjectVersion(projectDirectory, editorVersion);

    return this;
  }

  /**
   * Attempts to get a Unity project manifest from the mock file-system.
   * @param projectDirectory The Unity projects root directory.
   * @returns The manifest or null if not found.
   */
  public tryGetUnityProject(
    projectDirectory: string
  ): UnityProjectManifest | null {
    const manifestPath = manifestPathFor(projectDirectory);
    const manifestText = this.tryGetText(manifestPath);
    if (manifestText === null) return null;
    return parseProjectManifest(manifestText);
  }

  /**
   * Puts a upm-config into the mock file-system.
   * @param upmConfigPath The path to which to write the config.
   * @param upmConfig The upm config.
   */
  public putUpmConfig(upmConfigPath: string, upmConfig: UpmConfig): this {
    this.putText(upmConfigPath, serializeUpmConfig(upmConfig));
    return this;
  }

  /**
   * Puts a upm-config into the home directory of the mock file-system.
   * @param upmConfig The upm config.
   */
  public putHomeUpmConfig(upmConfig: UpmConfig): this {
    const upmConfigPath = path.join(homedir(), upmConfigFileName);
    return this.putUpmConfig(upmConfigPath, upmConfig);
  }
}
