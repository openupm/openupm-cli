import { Logger } from "npmlog";
import { PackumentNotFoundError } from "../common-errors";
import { DomainName } from "../domain/domain-name";
import { VersionNotFoundError } from "../domain/packument";
import { SemanticVersion } from "../domain/semantic-version";
import { EOL } from "node:os";
import { ResolvePackumentVersionError } from "../packument-version-resolving";

export function notifyPackumentNotFoundInAnyRegistry(
  log: Logger,
  packageName: DomainName
) {
  log.error(
    "",
    `The package "${packageName}" was not found in any of the provided registries.`
  );
  log.notice(
    "",
    "Please make sure you have spelled the name and registry urls correctly."
  );
}

export function notifyPackumentNotFoundInManifest(
  log: Logger,
  packageName: DomainName
) {
  log.error(
    "",
    `The package "${packageName}" was not found in your project manifest.`
  );
  log.notice("", "Please make sure you have spelled the name correctly.");
}

export function notifyOfMissingVersion(
  log: Logger,
  packageName: DomainName,
  requestedVersion: SemanticVersion,
  availableVersions: ReadonlyArray<SemanticVersion>
) {
  const versionList = availableVersions
    .map((version) => `\t- ${version}`)
    .join(EOL);

  log.error(
    "",
    `The package "${packageName}" has no published version "${requestedVersion}".`
  );
  log.notice("", `Maybe you meant one of the following:${EOL}${versionList}`);
}

export function notifyPackumentVersionResolvingFailed(
  log: Logger,
  packageName: DomainName,
  error: ResolvePackumentVersionError
) {
  if (error instanceof PackumentNotFoundError)
    notifyPackumentNotFoundInAnyRegistry(log, packageName);
  else if (error instanceof VersionNotFoundError)
    notifyOfMissingVersion(
      log,
      packageName,
      error.requestedVersion,
      error.availableVersions
    );
}
