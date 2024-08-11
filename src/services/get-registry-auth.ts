import { NpmAuth } from "another-npm-registry-client";
import { decodeBase64 } from "../domain/base64";
import { coerceRegistryUrl } from "../domain/registry-url";
import { addAuth, emptyUpmConfig, UpmConfig } from "../domain/upm-config";
import {
  loadUpmConfig,
  LoadUpmConfig,
  UpmAuth,
  UpmConfigContent,
} from "../io/upm-config-io";
import { recordEntries } from "../utils/record-utils";
import { trySplitAtFirstOccurrenceOf } from "../utils/string-utils";
import { removeExplicitUndefined } from "../utils/zod-utils";

/**
 * Service function for getting registry authentication.
 * @param upmConfigPath The path to the upmconfig.toml file.
 */
export type GetRegistryAuth = (upmConfigPath: string) => Promise<UpmConfig>;

/**
 * Makes a {@link GetRegistryAuth} function which gets it's information from
 * the users upm config.
 */
export function LoadRegistryAuthFromUpmConfig(
  loadUpmConfig: LoadUpmConfig
): GetRegistryAuth {
  return async (upmConfigPath) => {
    function importNpmAuth(input: UpmAuth): NpmAuth {
      // Basic auth
      if ("_auth" in input) {
        const decoded = decodeBase64(input._auth);
        const [username, password] = trySplitAtFirstOccurrenceOf(decoded, ":");
        if (password === null)
          throw new Error(
            "Auth Base64 string was not in the user:pass format."
          );
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

    function importUpmConfig(input: UpmConfigContent): UpmConfig {
      if (input.npmAuth === undefined) return {};
      return recordEntries(input.npmAuth)
        .map(
          ([url, auth]) =>
            [coerceRegistryUrl(url), importNpmAuth(auth)] as const
        )
        .reduce(
          (upmConfig, [url, auth]) => addAuth(upmConfig, url, auth),
          emptyUpmConfig
        );
    }

    const content = await loadUpmConfig(upmConfigPath);
    return content !== null ? importUpmConfig(content) : emptyUpmConfig;
  };
}

/**
 * Default {@link GetRegistryAuth} function. Uses {@link LoadRegistryAuthFromUpmConfig}.
 */
export const getRegistryAuth = LoadRegistryAuthFromUpmConfig(loadUpmConfig);
