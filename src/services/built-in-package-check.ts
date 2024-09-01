import RegClient from "another-npm-registry-client";
import { DomainName } from "../domain/domain-name";
import { packumentHasVersion } from "../domain/packument";
import { unityRegistry } from "../domain/registry";
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
  function hasDocPage(packageName: DomainName) {
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

  return async (packageName, version) => {
    const isUnityPackage = await hasDocPage(packageName);
    if (!isUnityPackage) return false;
    const isOnUnityRegistry = await versionIsOnRegistry(packageName, version);
    return !isOnUnityRegistry;
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
