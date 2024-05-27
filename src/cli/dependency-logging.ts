import { ValidDependency } from "../services/dependency-resolving";
import { makePackageReference } from "../domain/package-reference";
import { unityRegistryUrl } from "../domain/registry-url";
import { DebugLog } from "../logging";

/**
 * Logs information about a valid dependency to a logger.
 */
export function logValidDependency(
  debugLog: DebugLog,
  dependency: ValidDependency
) {
  const packageRef = makePackageReference(dependency.name, dependency.version);
  const tag =
    dependency.source === "built-in"
      ? "[internal] "
      : dependency.source === unityRegistryUrl
      ? "[upstream]"
      : "";
  const message = `${packageRef} ${tag}`;
  debugLog(message);
}
