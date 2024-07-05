import { DomainName } from "../domain/domain-name";
import { SemanticVersion } from "../domain/semantic-version";
import { CheckIsUnityPackage } from "./unity-package-check";
import { FetchPackument } from "../io/packument-io";
import { unityRegistryUrl } from "../domain/registry-url";
import { recordKeys } from "../utils/record-utils";

/**
 * Function for checking whether a specific package version is built-in.
 * @param packageName The packages name.
 * @param version The specific version to check.
 * @returns A boolean indicating whether the package version is built-in.
 */
export type CheckIsBuiltInPackage = (
  packageName: DomainName,
  version: SemanticVersion
) => Promise<boolean>;

/**
 * Makes a {@link CheckIsBuiltInPackage} function.
 */
export function makeCheckIsBuiltInPackage(
  checkIsUnityPackage: CheckIsUnityPackage,
  fetchPackument: FetchPackument
): CheckIsBuiltInPackage {
  async function checkExistsOnUnityRegistry(
    packageName: DomainName,
    version: SemanticVersion
  ): Promise<boolean> {
    const packument = await fetchPackument(
      { url: unityRegistryUrl, auth: null },
      packageName
    );
    if (packument === null) return false;
    const versions = recordKeys(packument.versions);
    return versions.includes(version);
  }

  return async (packageName, version) => {
    const isUnityPackage = await checkIsUnityPackage(packageName);
    if (!isUnityPackage) return false;
    return !(await checkExistsOnUnityRegistry(packageName, version));
  };
}
