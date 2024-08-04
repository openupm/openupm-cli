import { addAuth, emptyUpmConfig, UpmConfig } from "../domain/upm-config";
import { LoadUpmConfig, UpmAuth, UpmConfigContent } from "../io/upm-config-io";
import { NpmAuth } from "another-npm-registry-client";
import { decodeBase64 } from "../domain/base64";
import { trySplitAtFirstOccurrenceOf } from "../utils/string-utils";
import { removeExplicitUndefined } from "../utils/zod-utils";
import { recordEntries } from "../utils/record-utils";
import { coerceRegistryUrl } from "../domain/registry-url";

/**
 * Service function for loading registry authentication. Internally this
 * will load it from the upmconfig.toml.
 * @param upmConfigPath The path to the upmconfig.toml file.
 */
export type LoadRegistryAuth = (upmConfigPath: string) => Promise<UpmConfig>;

/**
 * Makes a {@link LoadRegistryAuth} function.
 */
export function makeLoadRegistryAuth(
  loadUpmConfig: LoadUpmConfig
): LoadRegistryAuth {
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
