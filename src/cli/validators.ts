import { mustBeParsable, mustSatisfy } from "./cli-parsing";
import { isPackageReference } from "../domain/package-reference";
import { isDomainName } from "../domain/domain-name";
import { coerceRegistryUrl } from "../domain/registry-url";

export const mustBePackageReference = mustSatisfy(
  isPackageReference,
  (input) => `"${input}" is not a valid package-reference`
);

export const mustBeDomainName = mustSatisfy(
  isDomainName,
  (input) => `"${input}" is not a valid package name`
);

export const mustBeRegistryUrl = mustBeParsable(
  coerceRegistryUrl,
  (input) => `"${input}" is not a valid registry-url`
);
