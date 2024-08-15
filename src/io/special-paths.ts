import { Err, Ok, Result } from "ts-results-es";
import os from "os";
import { CustomError } from "ts-custom-error";
import {
  compareEditorVersion,
  EditorVersion,
  makeEditorVersion,
  ReleaseVersion,
  stringifyEditorVersion,
} from "../domain/editor-version";
import { EditorVersionNotSupportedError } from "../common-errors";
import { tryGetEnv } from "../utils/env-util";

/**
 * Error for when a specific OS does not support a specific editor-version.
 */
export class VersionNotSupportedOnOsError extends CustomError {
  constructor(
    /**
     * The version that is not supported.
     */
    public readonly version: EditorVersion,
    /**
     * Name of the OS, which does not support the version.
     */
    public readonly os: string
  ) {
    super();
  }
}

/**
 * Error for when Unity does not support an OS.
 */
export class OSNotSupportedError extends CustomError {
  constructor(
    /**
     * Name of the unsupported OS.
     */
    public readonly os: string
  ) {
    super();
  }
}

/**
 * Function for getting the path of the users home directory.
 * @returns The path to the directory.
 */
export type GetHomePath = () => string;

export class NoHomePathError extends CustomError {}

/**
 * {@link GetHomePath} function which resolved the home path using the
 * `USERPROFILE` and `HOME` environment variables.
 * @throws {NoHomePathError} If none of the required env variables are set.
 */
export const getHomePathFromEnv: GetHomePath = () => {
  const homePath = tryGetEnv("USERPROFILE") ?? tryGetEnv("HOME");
  if (homePath === null) throw new NoHomePathError();
  return homePath;
};

/**
 * Errors which may occur when trying to resolve an editor-version.
 */
export type GetEditorInstallPathError =
  | VersionNotSupportedOnOsError
  | EditorVersionNotSupportedError
  | OSNotSupportedError;

const firstSupportedVersionOnLinux = makeEditorVersion(2019, 2);

/**
 * The first version which supports packages.
 * (The package-manager was officially added in 2017.
 * @see https://blog.unity.com/technology/project-management-is-evolving-unity-package-manager-overview
 */
const firstSupportedEditorVersion = makeEditorVersion(2018, 1);

/**
 * Attempts to get the default installation path of a specific Unity editor.
 * Returned paths do not include a trailing slash.
 * @param editorVersion The editor-version to get the path for. Must be a
 * release version ie 2020.2.1f1.
 */
export function tryGetEditorInstallPath(
  editorVersion: ReleaseVersion
): Result<string, GetEditorInstallPathError> {
  const isVersionSupported =
    compareEditorVersion(editorVersion, firstSupportedEditorVersion) >= 0;
  if (!isVersionSupported)
    return Err(new EditorVersionNotSupportedError(editorVersion));

  const platform = os.platform();
  const versionString = stringifyEditorVersion(editorVersion);

  if (platform === "win32")
    return Ok(`C:\\Program Files\\Unity\\Hub\\Editor\\${versionString}`);
  else if (platform === "linux") {
    const versionSupportsLinux =
      compareEditorVersion(editorVersion, firstSupportedVersionOnLinux) >= 0;
    if (versionSupportsLinux) return Ok(`~/Unity/Hub/Editor/${versionString}`);
    else return Err(new VersionNotSupportedOnOsError(editorVersion, platform));
  } else if (platform === "darwin")
    return Ok(`/Applications/Unity/Hub/Editor/${versionString}`);

  return Err(new OSNotSupportedError(platform));
}

/**
 * Function that gets the current working directories path.
 * @returns The path.
 */
export type GetCwd = () => string;

/**
 * {@link GetCwd} function which uses {@link process.cwd}.
 */
export const getProcessCwd: GetCwd = process.cwd;
