import { DomainName } from "../domain/domain-name";
import { SemanticVersion } from "../domain/semantic-version";
import { AsyncResult } from "ts-results-es";
import { CheckIsUnityPackage } from "./unity-package-check";
import { FetchPackument } from "../io/packument-io";
import { unityRegistryUrl } from "../domain/registry-url";
import { recordKeys } from "../utils/record-utils";
import { AsyncOk } from "../utils/result-utils";
import {
  GenericNetworkError,
  RegistryAuthenticationError,
} from "../io/common-errors";

export type CheckIsBuiltInPackageError = GenericNetworkError;

export type CheckIsBuiltInPackage = (
  packageName: DomainName,
  version: SemanticVersion
) => AsyncResult<boolean, CheckIsBuiltInPackageError>;

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
