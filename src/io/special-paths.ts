import { Err, Ok, Result } from "ts-results-es";
import { RequiredEnvMissingError } from "./upm-config-io";
import { tryGetEnv } from "../utils/env-util";
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

/**
 * Error for when a specific OS does not support a specific editor-version.
 */
export class VersionNotSupportedOnOsError extends CustomError {
  private readonly _class = "VersionNotSupportedOnOsError";
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
  private readonly _class = "OSNotSupportedError";
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
 * Attempts to get the current users home-directory.
 */
export function tryGetHomePath(): Result<string, RequiredEnvMissingError> {
  const homePath = tryGetEnv("USERPROFILE") ?? tryGetEnv("HOME");
  if (homePath === null)
    return Err(new RequiredEnvMissingError("USERPROFILE", "HOME"));
  return Ok(homePath);
}

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
