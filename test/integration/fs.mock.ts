import { homedir } from "os";
import path from "path";
import {
  emptyProjectManifest,
  manifestPathFor,
  type UnityProjectManifest,
} from "../../src/domain/project-manifest";
import { serializeProjectManifest } from "../../src/io/project-manifest-io";
import type { ReadTextFile, WriteTextFile } from "../../src/io/text-file-io";

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
  public putText(path: string, content: string): MockFs {
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
   * Put a Unity project into the mock file-system. This will add:
   *  - A project manifest.
   * @param config Configuration options for the project.
   * @returns The mock fs, for chaining.
   */
  public putUnityProject(config?: MockUnityProjectConfig): MockFs {
    const projectDirectory =
      config?.projectDirectory ?? path.join(homedir(), "/projects/SomeProject");

    const manifest = config?.manifest ?? emptyProjectManifest;
    const manifestPath = manifestPathFor(projectDirectory);
    this.putText(manifestPath, serializeProjectManifest(manifest));

    return this;
  }
}
