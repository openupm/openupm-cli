import { mustBeParsable, mustSatisfy } from "./cli-parsing";
import { isPackageReference } from "../domain/package-reference";
import { coerceRegistryUrl } from "../domain/registry-url";
import { isZod } from "../utils/zod-utils";
import { DomainName } from "../domain/domain-name";

export const mustBePackageReference = mustSatisfy(
  isPackageReference,
  (input) => `"${input}" is not a valid package-reference`
);

export const mustBeDomainName = mustSatisfy(
  (s): s is DomainName => isZod(s, DomainName),
  (input) => `"${input}" is not a valid package name`
);

export const mustBeRegistryUrl = mustBeParsable(
  coerceRegistryUrl,
  (input) => `"${input}" is not a valid registry-url`
);
