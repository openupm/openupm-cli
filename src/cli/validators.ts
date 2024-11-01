import { DomainName } from "../domain/domain-name.js";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { isPackageSpec, type PackageSpec } from "../domain/package-spec.js";
import { coerceRegistryUrl } from "../domain/registry-url.js";
import { isZod } from "../domain/zod-utils.js";
import { mustBeParsable, mustSatisfy } from "./cli-parsing.js";

/**
 * {@link CliValueParser} for checking that a string is a {@link PackageSpec}.
 */
export const mustBePackageSpec = mustSatisfy(
  isPackageSpec,
  (input) => `"${input}" is not a valid package-spec`
);

/**
 * {@link CliValueParser} for checking that a string is a {@link DomainName}.
 */
export const mustBeDomainName = mustSatisfy(
  (s): s is DomainName => isZod(s, DomainName),
  (input) => `"${input}" is not a valid package name`
);

/**
 * {@link CliValueParser} for checking that a string is a {@link RegistryUrl}.
 */
export const mustBeRegistryUrl = mustBeParsable(
  coerceRegistryUrl,
  (input) => `"${input}" is not a valid registry-url`
);
