import { DomainName } from "../domain/domain-name";
import { unityRegistryUrl } from "../domain/registry-url";
import { SemanticVersion } from "../domain/semantic-version";
import { getRegistryPackument, GetRegistryPackument } from "../io/packument-io";
import { recordKeys } from "../utils/record-utils";
import {
  checkIsUnityPackage,
  CheckIsUnityPackage,
} from "./unity-package-check";

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
 * Makes a {@link CheckIsBuiltInPackage} function which checks if package is
 * built-in by establishing if the package is an official Unity package which
 * does not exist on the Unity package registry.
 */
export function CheckIsNonRegistryUnityPackage(
  checkIsUnityPackage: CheckIsUnityPackage,
  getRegistryPackument: GetRegistryPackument
): CheckIsBuiltInPackage {
  async function checkExistsOnUnityRegistry(
    packageName: DomainName,
    version: SemanticVersion
  ): Promise<boolean> {
    const packument = await getRegistryPackument(
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

/**
 * Default {@link CheckIsBuiltInPackage}. Uses {@link CheckIsNonRegistryUnityPackage}.
 */
export const checkIsBuiltInPackage = CheckIsNonRegistryUnityPackage(
  checkIsUnityPackage,
  getRegistryPackument
);
