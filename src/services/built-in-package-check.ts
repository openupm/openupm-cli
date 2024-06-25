import { DomainName } from "../domain/domain-name";
import { SemanticVersion } from "../domain/semantic-version";
import { AsyncResult } from "ts-results-es";
import {
  CheckIsUnityPackage,
  CheckIsUnityPackageError,
} from "./unity-package-check";
import { FetchPackument } from "../io/packument-io";
import { unityRegistryUrl } from "../domain/registry-url";
import { recordKeys } from "../utils/record-utils";
import { AsyncOk } from "../utils/result-utils";
import {
  GenericNetworkError,
  RegistryAuthenticationError,
} from "../io/common-errors";
import { FetchAllPackumentsError } from "../io/all-packuments-io";

/**
 * Error which may occur when checking whether a package is built-in.
 */
export type CheckIsBuiltInPackageError =
  | CheckIsUnityPackageError
  | FetchAllPackumentsError;

/**
 * Function for checking whether a specific package version is built-in.
 * @param packageName The packages name.
 * @param version The specific version to check.
 * @returns A boolean indicating whether the package version is built-in.
 */
export type CheckIsBuiltInPackage = (
  packageName: DomainName,
  version: SemanticVersion
) => AsyncResult<boolean, CheckIsBuiltInPackageError>;

/**
 * Makes a {@link CheckIsBuiltInPackage} function.
 */
export function makeCheckIsBuiltInPackage(
  checkIsUnityPackage: CheckIsUnityPackage,
  fetchPackument: FetchPackument
): CheckIsBuiltInPackage {
  function checkExistsOnUnityRegistry(
    packageName: DomainName,
    version: SemanticVersion
  ): AsyncResult<boolean, GenericNetworkError> {
    return fetchPackument({ url: unityRegistryUrl, auth: null }, packageName)
      .map((maybePackument) => {
        if (maybePackument === null) return false;
        const versions = recordKeys(maybePackument.versions);
        return versions.includes(version);
      })
      .mapErr((error) => {
        if (error instanceof RegistryAuthenticationError)
          throw new Error(
            "Authentication with Unity registry failed, even though it does not require authentication."
          );

        return error;
      });
  }

  return (packageName, version) => {
    return checkIsUnityPackage(packageName).andThen((isUnityPackage) => {
      if (!isUnityPackage) return AsyncOk(false);
      return checkExistsOnUnityRegistry(packageName, version).map(
        (existsOnUnityRegistry) => !existsOnUnityRegistry
      );
    });
  };
}
