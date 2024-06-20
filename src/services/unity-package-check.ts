import { DomainName } from "../domain/domain-name";
import { AsyncResult } from "ts-results-es";
import { CheckPage } from "../io/check-page";
import { GenericNetworkError } from "../io/common-errors";

export type CheckIsUnityPackageError = GenericNetworkError;

export type CheckIsUnityPackage = (
  packageName: DomainName
) => AsyncResult<boolean, CheckIsUnityPackageError>;

export function makeCheckIsUnityPackage(checkPage: CheckPage): CheckIsUnityPackage {
  return (packageName) => {
    // A package is an official Unity package if it has a documentation page
    const url = `https://docs.unity3d.com/Manual/${packageName}.html`;
    return checkPage(url);
  };
}
