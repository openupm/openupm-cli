import { PackageReference } from "../domain/package-reference";
import { RegistryUrl, unityRegistryUrl } from "../domain/registry-url";
import { DebugLog } from "../logging";

/**
 * Logs information about a valid dependency to a logger.
 */
export function logValidDependency(
  debugLog: DebugLog,
  packageRef: PackageReference,
  source: RegistryUrl | "built-in"
) {
  const tag =
    source === "built-in"
      ? "[internal] "
      : source === unityRegistryUrl
      ? "[upstream]"
      : "";
  const message = `${packageRef} ${tag}`;
  debugLog(message);
}
