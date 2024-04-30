import { ValidDependency } from "../services/dependency-resolving";
import { makePackageReference } from "../domain/package-reference";
import { Logger } from "npmlog";
import { unityRegistryUrl } from "../domain/registry-url";

/**
 * Logs information about a valid dependency to a logger.
 */
export function logValidDependency(log: Logger, dependency: ValidDependency) {
  const packageRef = makePackageReference(dependency.name, dependency.version);
  const tag =
    dependency.source === "built-in"
      ? "[internal] "
      : dependency.source === unityRegistryUrl
      ? "[upstream]"
      : "";
  const message = `${packageRef} ${tag}`;
  log.verbose("dependency", message);
}