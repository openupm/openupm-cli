import { Logger } from "npmlog";
import { PackumentNotFoundError } from "../common-errors";
import { DomainName } from "../domain/domain-name";
import { VersionNotFoundError } from "../domain/packument";
import { SemanticVersion } from "../domain/semantic-version";
import { EOL } from "node:os";
import { ResolvePackumentVersionError } from "../packument-version-resolving";

export function suggestCheckingWorkingDirectory(log: Logger) {
  log.notice("", "Are you in the correct working directory?");
}

export function notifyManifestMissing(log: Logger, filePath: string) {
  log.error("", `Could not locate your project manifest at "${filePath}".`);
  suggestCheckingWorkingDirectory(log);
}

export function suggestFixErrorsInProjectManifest(log: Logger) {
  log.notice(
    "",
    "Please fix the errors in your project manifest and try again."
  );
}

export function notifySyntacticallyMalformedProjectManifest(log: Logger) {
  log.error("", "Project manifest file contained json syntax errors.");
  suggestFixErrorsInProjectManifest(log);
}

export function notifySemanticallyMalformedProjectManifest(log: Logger) {
  log.error(
    "",
    "Project manifest is valid json but was not of the correct shape."
  );
  suggestFixErrorsInProjectManifest(log);
}

export function notifyManifestLoadFailedBecauseIO(log: Logger) {
  log.error(
    "",
    "Could not load project manifest because of a file-system error."
  );
}

export function notifyManifestWriteFailed(log: Logger) {
  log.error(
    "",
    "Could not save project manifest because of a file-system error."
  );
}

export function notifyNotUsingWsl(log: Logger) {
  log.error("", "No wsl detected.");
  log.notice("", "Please make sure you are actually running openupm in wsl.");
}

export function notifyChildProcessError(log: Logger) {
  log.error("", "A child process encountered an error.");
}

export function notifyMissingEnvForUpmConfigPath(
  log: Logger,
  variableNames: string[]
) {
  const nameList = variableNames.map((name) => `"${name}"`).join(", ");
  log.error(
    "",
    "Could not determine upm-config path because of missing home environment variables."
  );
  log.notice(
    "",
    `Please make sure that you set one of the following environment variables: ${nameList}.`
  );
}

export function notifySyntacticallyMalformedUpmConfig(log: Logger) {
  log.error("", "Upm-config file contained toml syntax errors.");
  log.notice("", "Please fix the errors in your upm-config and try again.");
}

export function notifyProjectVersionMissing(log: Logger, filePath: string) {
  log.error(
    "",
    `Could not locate your projects version file (ProjectVersion.txt) at "${filePath}".`
  );
  suggestCheckingWorkingDirectory(log);
}

export function suggestFixErrorsInProjectVersionFile(log: Logger) {
  log.notice(
    "",
    "Please fix the errors in your project version file and try again."
  );
}

export function notifySyntacticallyMalformedProjectVersion(log: Logger) {
  log.error(
    "",
    "Project version file (ProjectVersion.txt) file contained yaml syntax errors."
  );
  suggestFixErrorsInProjectVersionFile(log);
}

export function notifySemanticallyMalformedProjectVersion(log: Logger) {
  log.error(
    "",
    "Project version file (ProjectVersion.txt) file is valid yaml but was not of the correct shape."
  );
  suggestFixErrorsInProjectVersionFile(log);
}

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

export function notifyNoVersions(log: Logger, packageName: DomainName) {
  log.error("", `The package ${packageName} has no versions.`);
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
