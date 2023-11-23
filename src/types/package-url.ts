import { Brand } from "ts-brand";
import { PkgVersion } from "./global";

/**
 * A string of an url pointing to a local or remote package
 */
export type PackageUrl = Brand<string, "PackageUrl">;

const isGit = (version: PkgVersion): boolean => version.startsWith("git");

const isHttp = (version: PkgVersion): boolean => version.startsWith("http");

const isLocal = (version: PkgVersion): boolean => version.startsWith("file");

/**
 * Checks if a version is a package-url
 * @param version The version
 */
export const isPackageUrl = (version: PkgVersion): version is PackageUrl =>
  isGit(version) || isHttp(version) || isLocal(version);
