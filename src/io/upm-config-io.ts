import path from "path";
import TOML from "@iarna/toml";
import { ReadTextFile, WriteTextFile } from "./text-file-io";
import { tryGetEnv } from "../utils/env-util";
import { tryGetWslPath } from "./wsl";
import { RunChildProcess } from "./child-process";
import { GetHomePath } from "./special-paths";
import { CustomError } from "ts-custom-error";
import { z } from "zod";
import {
  removeExplicitUndefined,
  RemoveExplicitUndefined,
} from "../utils/zod-utils";
import { addAuth, emptyUpmConfig, UPMConfig } from "../domain/upm-config";
import { Base64, decodeBase64, encodeBase64 } from "../domain/base64";
import { NpmAuth } from "another-npm-registry-client";
import { coerceRegistryUrl, RegistryUrl } from "../domain/registry-url";
import { recordEntries } from "../utils/record-utils";
import { trySplitAtFirstOccurrenceOf } from "../utils/string-utils";

const configFileName = ".upmconfig.toml";

export class NoSystemUserProfilePath extends CustomError {}

/**
 * Function which gets the path to the upmconfig file.
 * @param wsl Whether WSL should be treated as Windows.
 * @param systemUser Whether to authenticate as a Windows system-user.
 * @returns The file path.
 */
export type GetUpmConfigPath = (
  wsl: boolean,
  systemUser: boolean
) => Promise<string>;

/**
 * Makes a {@link GetUpmConfigPath} function.
 */
export function makeGetUpmConfigPath(
  getHomePath: GetHomePath,
  runChildProcess: RunChildProcess
): GetUpmConfigPath {
  async function getConfigDirectory(wsl: boolean, systemUser: boolean) {
    const systemUserSubPath = "Unity/config/ServiceAccounts";
    if (wsl) {
      if (systemUser)
        return await tryGetWslPath("ALLUSERSPROFILE", runChildProcess).then(
          (it) => path.join(it, systemUserSubPath)
        );

      return await tryGetWslPath("USERPROFILE", runChildProcess);
    }

    if (systemUser) {
      const profilePath = tryGetEnv("ALLUSERSPROFILE");
      if (profilePath === null) throw new NoSystemUserProfilePath();
      return path.join(profilePath, systemUserSubPath);
    }

    return getHomePath();
  }

  return async (wsl, systemUser) => {
    const directory = await getConfigDirectory(wsl, systemUser);
    return path.join(directory, configFileName);
  };
}

const authBaseSchema = z.object({
  alwaysAuth: z.optional(z.boolean()),
});

const basicAuthSchema = authBaseSchema.and(
  z.object({
    email: z.string().email(),
    _auth: Base64,
  })
);

const tokenAuthSchema = authBaseSchema.and(
  z.object({
    email: z.optional(z.string().email()),
    token: z.string(),
  })
);

const upmAuthSchema = basicAuthSchema.or(tokenAuthSchema);

const upmConfigContentSchema = z.object({
  npmAuth: z.optional(z.record(z.string(), upmAuthSchema)),
});

type UpmAuth = RemoveExplicitUndefined<z.TypeOf<typeof upmAuthSchema>>;

/**
 * The content of a .upmconfig.toml file.
 */
type UpmConfigContent = RemoveExplicitUndefined<
  z.TypeOf<typeof upmConfigContentSchema>
>;

/**
 * IO function for loading an upm-config file.
 * @param configFilePath Path of the upm-config file.
 * @returns The config or null if it was not found.
 */
export type LoadUpmConfig = (
  configFilePath: string
) => Promise<UPMConfig | null>;

async function tryReadUpmConfigContent(
  configFilePath: string,
  readFile: ReadTextFile
): Promise<UpmConfigContent | null> {
  const stringContent = await readFile(configFilePath, true);
  if (stringContent === null) return null;
  const tomlContent = TOML.parse(stringContent);
  return removeExplicitUndefined(upmConfigContentSchema.parse(tomlContent));
}

/**
 * Makes a {@link LoadUpmConfig} function.
 */
export function makeLoadUpmConfig(readFile: ReadTextFile): LoadUpmConfig {
  function importNpmAuth(input: UpmAuth): NpmAuth {
    // Basic auth
    if ("_auth" in input) {
      const decoded = decodeBase64(input._auth);
      const [username, password] = trySplitAtFirstOccurrenceOf(decoded, ":");
      if (password === null)
        throw new Error("Auth Base64 string was not in the user:pass format.");
      return removeExplicitUndefined({
        username,
        password,
        email: input.email,
        alwaysAuth: input.alwaysAuth,
      });
    }

    // Bearer auth
    return removeExplicitUndefined({
      token: input.token,
      alwaysAuth: input.alwaysAuth,
    });
  }

  function importUpmConfig(input: UpmConfigContent): UPMConfig {
    if (input.npmAuth === undefined) return {};
    return recordEntries(input.npmAuth)
      .map(
        ([url, auth]) => [coerceRegistryUrl(url), importNpmAuth(auth)] as const
      )
      .reduce(
        (upmConfig, [url, auth]) => addAuth(upmConfig, url, auth),
        emptyUpmConfig
      );
  }

  return async (configFilePath) => {
    const content = await tryReadUpmConfigContent(configFilePath, readFile);
    if (content === null) return null;
    return importUpmConfig(content);
  };
}

export type PutUpmAuth = (
  configFilePath: string,
  registry: RegistryUrl,
  auth: NpmAuth
) => Promise<void>;

export function makePutUpmAuth(
  readFile: ReadTextFile,
  writeFile: WriteTextFile
): PutUpmAuth {
  function mergeEntries(oldEntry: UpmAuth | null, newEntry: NpmAuth): UpmAuth {
    const alwaysAuth = newEntry.alwaysAuth ?? oldEntry?.alwaysAuth;

    if ("token" in newEntry) {
      return removeExplicitUndefined({
        token: newEntry.token,
        email: oldEntry?.email,
        alwaysAuth,
      });
    }

    return removeExplicitUndefined({
      _auth: encodeBase64(`${newEntry.username}:${newEntry.password}`),
      email: newEntry.email,
      alwaysAuth,
    });
  }

  return async (configFilePath, registry, auth) => {
    const currentContent = await tryReadUpmConfigContent(
      configFilePath,
      readFile
    );

    const oldEntries = currentContent?.npmAuth ?? {};
    // Search the entry both with and without trailing slash
    const oldEntry = oldEntries[registry] ?? oldEntries[registry + "/"] ?? null;
    const newContent: UpmConfigContent = removeExplicitUndefined({
      npmAuth: {
        ...oldEntries,
        // Remove entry with trailing slash
        [registry + "/"]: undefined,
        [registry]: mergeEntries(oldEntry, auth),
      },
    });
    const textContent = TOML.stringify(newContent);
    await writeFile(configFilePath, textContent);
  };
}
