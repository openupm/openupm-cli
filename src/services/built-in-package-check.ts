import { DomainName } from "../domain/domain-name";
import { SemanticVersion } from "../domain/semantic-version";
import { AsyncResult, Ok } from "ts-results-es";
import {
  CheckIsUnityPackage,
  CheckIsUnityPackageError,
} from "./unity-package-check";
import { FetchPackument } from "../io/packument-io";
import { unityRegistryUrl } from "../domain/registry-url";
import { recordKeys } from "../utils/record-utils";
import { AsyncOk } from "../utils/result-utils";
import { GenericNetworkError } from "../io/common-errors";

/**
 * Error which may occur when checking whether a package is built-in.
 */
export type CheckIsBuiltInPackageError = CheckIsUnityPackageError;

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
    return new AsyncResult(
      fetchPackument({ url: unityRegistryUrl, auth: null }, packageName).then(
        (maybePackument) => {
          if (maybePackument === null) return Ok(false);
          const versions = recordKeys(maybePackument.versions);
          return Ok(versions.includes(version));
        }
      )
    );
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
