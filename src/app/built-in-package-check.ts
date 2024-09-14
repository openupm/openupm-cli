import { DomainName } from "../domain/domain-name";
import { packumentHasVersion } from "../domain/packument";
import { unityRegistry } from "../domain/registry";
import { SemanticVersion } from "../domain/semantic-version";
import type { GetRegistryPackument } from "../io/registry";
import { CheckUrlExists } from "../io/www";

/**
 * Gets the documentation page url for a package.
 * @param packageName The name of the package.
 * @returns The url.
 */
export function docUrlForPackage(packageName: DomainName) {
  return `https://docs.unity3d.com/Manual/${packageName}.html`;
}

/**
 * Checks whether a package is a built-in Unity package. It does this by
 * checking whether the package 1.) is an official Unity package and 2.) is not
 * hosted on the Unity registry.
 * @param checkUrlExists Function for checking whether a url exists.
 * @param getRegistryPackument Function for getting a packument from a registry.
 * @param packageName The name of the package to check.
 * @param version The  version of the package to check.
 * @returns Whether the package is built-in.
 */
export async function checkIsBuiltInPackageUsing(
  checkUrlExists: CheckUrlExists,
  getRegistryPackument: GetRegistryPackument,
  packageName: DomainName,
  version: SemanticVersion
): Promise<boolean> {
  function checkIsUnityPackage(packageName: DomainName) {
    // A package is an official Unity package if it has a documentation page
    const url = docUrlForPackage(packageName);
    return checkUrlExists(url);
  }

  async function versionIsOnRegistry(
    packageName: DomainName,
    version: SemanticVersion
  ): Promise<boolean> {
    const packument = await getRegistryPackument(unityRegistry, packageName);
    return packument !== null && packumentHasVersion(packument, version);
  }

  const isUnityPackage = await checkIsUnityPackage(packageName);
  if (!isUnityPackage) return false;
  return !(await versionIsOnRegistry(packageName, version));
}
