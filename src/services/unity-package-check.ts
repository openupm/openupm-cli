import { DomainName } from "../domain/domain-name";
import { AsyncResult } from "ts-results-es";
import { CheckUrlExists } from "../io/check-url";
import { GenericNetworkError } from "../io/common-errors";

/**
 * Error which may occur when checking whether a package is a Unity package.
 */
export type CheckIsUnityPackageError = GenericNetworkError;

/**
 * Function for checking whether a package is an official Unity package.
 * @param packageName The name of the package.
 * @returns A boolean indicating whether the package is a Unity package.
 */
export type CheckIsUnityPackage = (
  packageName: DomainName
) => AsyncResult<boolean, CheckIsUnityPackageError>;

/**
 * Makes a {@link CheckIsUnityPackage} function.
 */
export function makeCheckIsUnityPackage(
  checkUrlExists: CheckUrlExists
): CheckIsUnityPackage {
  return (packageName) => {
    // A package is an official Unity package if it has a documentation page
    const url = `https://docs.unity3d.com/Manual/${packageName}.html`;
    return checkUrlExists(url);
  };
}
