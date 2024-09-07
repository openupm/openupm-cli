import { NpmAuth } from "another-npm-registry-client";
import { RegistryUrl } from "../domain/registry-url";
import { GetAuthToken } from "../io/get-auth-token";
import { type ReadTextFile, type WriteTextFile } from "../io/text-file-io";
import { DebugLog } from "../logging";
import { partialApply } from "../utils/fp-utils";
import { saveNpmAuthTokenUsing } from "./put-npm-auth-token";
import { putRegistryAuthUsing } from "./put-registry-auth";

/**
 * Logs a user into a package registry. Supports both basic and
 * token-based authentication.
 * @param homePath The users home path.
 * @param getAuthToken IO function for getting an auth token.
 * @param readTextFile IO function for reading text files.
 * @param writeTextFile IO function for writing text files.
 * @param debugLog IO function for printing debug logs.
 * @param username The username with which to login.
 * @param password The password with which to login.
 * @param email The email with which to login.
 * @param alwaysAuth Whether to always authenticate.
 * @param registry The url of the registry with which to authenticate.
 * @param configPath Path of the upm-config file in which to store
 * authentication information.
 * @param authMode Whether to use basic or token-based authentication.
 */
export async function loginUsing(
  homePath: string,
  getAuthToken: GetAuthToken,
  readTextFile: ReadTextFile,
  writeTextFile: WriteTextFile,
  debugLog: DebugLog,
  username: string,
  password: string,
  email: string,
  alwaysAuth: boolean,
  registry: RegistryUrl,
  configPath: string,
  authMode: "basic" | "token"
): Promise<void> {
  const putRegistryAuth = partialApply(
    putRegistryAuthUsing,
    readTextFile,
    writeTextFile
  );

  const putNpmAuthToken = partialApply(
    saveNpmAuthTokenUsing,
    readTextFile,
    writeTextFile
  );

  if (authMode === "basic") {
    const auth: NpmAuth = { username, password, email, alwaysAuth };
    return await putRegistryAuth(configPath, registry, auth);
  }

  // npm login
  const token = await getAuthToken(registry, username, email, password);
  await debugLog(`npm login successful`);

  const auth: NpmAuth = { token, email, alwaysAuth };
  await putRegistryAuth(configPath, registry, auth);

  const npmrcPath = await putNpmAuthToken(homePath, registry, token);
  await debugLog(`saved to npm config: ${npmrcPath}`);
}
