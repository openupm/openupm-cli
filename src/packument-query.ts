import { VersionReference } from "./types/package-reference";
import { fetchPackument, NpmClient, Registry } from "./registry-client";
import { DomainName } from "./types/domain-name";
import { SemanticVersion } from "./types/semantic-version";
import { UnityPackument, UnityPackumentVersion } from "./types/packument";
import { recordKeys } from "./utils/record-utils";
import { PackageUrl } from "./types/package-url";

/**
 * A version-reference that is resolvable.
 * Mostly this excludes {@link PackageUrl}s.
 */
type ResolvableVersion = Exclude<VersionReference, PackageUrl> | undefined;

/**
 * A successfully resolved packument-version.
 */
type ResolveSuccess = {
  /**
   * Indicates success.
   */
  readonly isSuccess: true;
  /**
   * The resolved packument-version.
   */
  readonly packumentVersion: UnityPackumentVersion;
};

interface FailureCase<TIssue extends string> {
  /**
   * Indicates failure.
   */
  readonly isSuccess: false;
  /**
   * Identifies the issue that caused the failure.
   */
  readonly issue: TIssue;
}

/**
 * Failure for when the packument was not found on the searched registry.
 */
interface PackumentNotFoundFailure extends FailureCase<"PackumentNotFound"> {}

/**
 * Failure for when a packument with the searched name was found, but it
 * had no versions.
 */
interface NoVersionsFailure extends FailureCase<"NoVersions"> {}

/**
 * Failure for when a packument with the searched name was found, but a specific
 * requested version did not exist.
 */
interface VersionNotFoundFailure extends FailureCase<"VersionNotFound"> {
  /**
   * The version that was requested.
   */
  readonly requestedVersion: SemanticVersion;
  /**
   * A list of available versions.
   */
  readonly availableVersions: ReadonlyArray<SemanticVersion>;
}

/**
 * A failed attempt at resolving a packument-version.
 */
type ResolveFailure =
  | PackumentNotFoundFailure
  | NoVersionsFailure
  | VersionNotFoundFailure;

/**
 * The result of attempting to resolve a packument-version.
 */
type ResolveResult = ResolveSuccess | ResolveFailure;

/**
 * Attempts to resolve a specific version from a packument.
 * @param packument The packument to search.
 * @param requestedVersion The requested version.
 */
export function tryResolveFromPackument(
  packument: UnityPackument,
  requestedVersion: ResolvableVersion
): ResolveResult {
  const availableVersions = recordKeys(packument.versions);
  if (availableVersions.length === 0)
    return { isSuccess: false, issue: "NoVersions" };

  // Find the latest version
  if (requestedVersion === undefined || requestedVersion === "latest") {
    const latestVersion = availableVersions.at(-1)!;
    return {
      isSuccess: true,
      packumentVersion: packument.versions[latestVersion]!,
    };
  }

  // Find a specific version
  if (!availableVersions.includes(requestedVersion))
    return {
      isSuccess: false,
      issue: "VersionNotFound",
      requestedVersion,
      availableVersions,
    };

  return {
    isSuccess: true,
    packumentVersion: packument.versions[requestedVersion]!,
  };
}

/**
 * Attempts to resolve a packument from a specific registry.
 * @param npmClient An npm client to interact with the registry.
 * @param packageName The name of the package to resolve.
 * @param requestedVersion The version that should be resolved.
 * @param registry The registry to resolve the packument from.
 */
export async function tryResolve(
  npmClient: NpmClient,
  packageName: DomainName,
  requestedVersion: ResolvableVersion,
  registry: Registry
): Promise<ResolveResult> {
  const packument = await fetchPackument(registry, packageName, npmClient);
  if (packument === undefined)
    return { isSuccess: false, issue: "PackumentNotFound" };

  return tryResolveFromPackument(packument, requestedVersion);
}
