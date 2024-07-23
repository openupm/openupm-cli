import { PackageReference } from "../domain/package-reference";
import { RegistryUrl, unityRegistryUrl } from "../domain/registry-url";
import { DebugLog } from "../logging";
import { recordEntries } from "../utils/record-utils";
import { Logger } from "npmlog";
import { DomainName } from "../domain/domain-name";
import { SemanticVersion } from "../domain/semantic-version";
import { FailedNode } from "../domain/dependency-graph";
import { ResolvePackumentVersionError } from "../domain/packument";
import { PackumentNotFoundError } from "../common-errors";

/**
 * Logs information about a resolved dependency to a logger.
 */
export function logResolvedDependency(
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

function errorMessageFor(error: ResolvePackumentVersionError): string {
  if (error instanceof PackumentNotFoundError) return "package not found";
  else return "version not found";
}

/**
 * Prints information about a dependency that could not be resolved to a logger.
 * @param log The logger to print to.
 * @param dependencyName The name of the dependency.
 * @param dependencyVersion The version of the dependency.
 * @param dependency The failed node from the dependency graph.
 */
export function logFailedDependency(
  log: Logger,
  dependencyName: DomainName,
  dependencyVersion: SemanticVersion,
  dependency: FailedNode
) {
  log.warn(
    "",
    `Failed to resolve dependency "${dependencyName}@${dependencyVersion}"`
  );
  recordEntries(dependency.errors).forEach(([errorSource, error]) =>
    log.warn("", `  - "${errorSource}": ${errorMessageFor(error)}`)
  );
}
