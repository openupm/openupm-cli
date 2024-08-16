import path from "path";
import { CustomError } from "ts-custom-error";

const configFileName = ".upmconfig.toml";

export class NoSystemUserProfilePath extends CustomError {}

/**
 * Determines the path to the users `.upmconfig.toml` file, based on the
 * given parameters.
 * @param envVars The current environment variables.
 * @param homePath The users home path.
 * @param forSystemUser Whether to get the path for the system user instead
 * of the current one.
 * @returns The resolved path.
 * @throws {NoSystemUserProfilePath} When trying to get the path for the
 * system-user but the `ALLUSERSPROFILE` env var is not set.
 * @see https://docs.unity3d.com/Manual/upm-config.html
 */
export function getUserUpmConfigPathFor(
  envVars: Record<string, string | undefined>,
  homePath: string,
  forSystemUser: boolean
): string {
  function getConfigDirectory() {
    const systemUserSubPath = "Unity/config/ServiceAccounts";
    if (forSystemUser) {
      const profilePath = envVars["ALLUSERSPROFILE"];
      if (profilePath === undefined) throw new NoSystemUserProfilePath();
      return path.join(profilePath, systemUserSubPath);
    }

    return homePath;
  }

  const customDir = envVars["UPM_USER_CONFIG_FILE"];
  if (customDir !== undefined) return path.resolve(customDir);

  const directory = getConfigDirectory();
  return path.join(directory, configFileName);
}
