import { DomainName } from "../domain/domain-name";
import { CheckUrlExists } from "../io/check-url";

/**
 * Function for checking whether a package is an official Unity package.
 * @param packageName The name of the package.
 * @returns A boolean indicating whether the package is a Unity package.
 */
export type CheckIsUnityPackage = (packageName: DomainName) => Promise<boolean>;

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
