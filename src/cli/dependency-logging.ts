import { ValidDependency } from "../services/dependency-resolving";
import { makePackageReference } from "../domain/package-reference";
import { Logger } from "npmlog";
import { unityRegistryUrl } from "../domain/registry-url";

/**
 * Logs information about a valid dependency to a logger.
 */
export function logValidDependency(log: Logger, dependency: ValidDependency) {
  const packageRef = makePackageReference(dependency.name, dependency.version);
  const internalTag = dependency.internal ? "[internal] " : "";
  const upstreamTag =
    dependency.source === unityRegistryUrl ? "[upstream]" : "";
  const message = `${packageRef} ${internalTag}${upstreamTag}`;
  log.verbose("dependency", message);
}
