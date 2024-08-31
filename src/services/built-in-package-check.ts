import RegClient from "another-npm-registry-client";
import { DomainName } from "../domain/domain-name";
import { packumentHasVersion } from "../domain/packument";
import { unityRegistryUrl } from "../domain/registry-url";
import { SemanticVersion } from "../domain/semantic-version";
import { CheckUrlExists, fetchCheckUrlExists } from "../io/check-url";
import {
  GetRegistryPackument,
  getRegistryPackumentUsing,
} from "../io/packument-io";
import { DebugLog } from "../logging";

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

function docUrlForPackage(packageName: DomainName) {
  return `https://docs.unity3d.com/Manual/${packageName}.html`;
}

/**
 * Makes a {@link CheckIsBuiltInPackage} function which checks if package is
 * built-in by establishing if the package is an official Unity package which
 * does not exist on the Unity package registry.
 */
export function CheckIsNonRegistryUnityPackage(
  checkUrlExists: CheckUrlExists,
  getRegistryPackument: GetRegistryPackument
): CheckIsBuiltInPackage {
  function checkIsUnityPackage(packageName: DomainName) {
    // A package is an official Unity package if it has a documentation page
    const url = docUrlForPackage(packageName);
    return checkUrlExists(url);
  }

  async function checkExistsOnUnityRegistry(
    packageName: DomainName,
    version: SemanticVersion
  ): Promise<boolean> {
    const packument = await getRegistryPackument(
      { url: unityRegistryUrl, auth: null },
      packageName
    );
    if (packument === null) return false;
    return packumentHasVersion(packument, version);
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
export const checkIsBuiltInPackage = (
  registryClient: RegClient.Instance,
  debugLog: DebugLog
) =>
  CheckIsNonRegistryUnityPackage(
    fetchCheckUrlExists,
    getRegistryPackumentUsing(registryClient, debugLog)
  );
