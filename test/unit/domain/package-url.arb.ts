import fc from "fast-check";
import { PackageUrl } from "../../../src/domain/package-url.js";
import { arbDomainName } from "./domain-name.arb.js";

/**
 * Arbitrary {@link PackageUrl} with `http` protocol.
 */
export const arbHttpPackageUrl = arbDomainName
  .map((packageName) => `http://github.com/user/${packageName}`)
  .map(PackageUrl.parse);

/**
 * Arbitrary {@link PackageUrl} with `https` protocol.
 */
export const arbHttpsPackageUrl = arbDomainName
  .map((packageName) => `https://github.com/user/${packageName}`)
  .map(PackageUrl.parse);

/**
 * Arbitrary {@link PackageUrl} with `git` protocol.
 */
export const arbGitPackageUrl = arbDomainName
  .map((packageName) => `git@github:user/${packageName}`)
  .map(PackageUrl.parse);

/**
 * Arbitrary {@link PackageUrl} with `file` protocol.
 */
export const arbFilePackageUrl = arbDomainName
  .map((packageName) => `file://users/some-user/projects/${packageName}`)
  .map(PackageUrl.parse);

/**
 * Arbitrary {@link PackageUrl} with one of the valid protocols.
 */
export const arbPackageUrl = fc.oneof(
  arbHttpPackageUrl,
  arbHttpsPackageUrl,
  arbGitPackageUrl,
  arbFilePackageUrl
);
