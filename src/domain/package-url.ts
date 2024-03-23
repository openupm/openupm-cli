import { Brand } from "ts-brand";

/**
 * A string of an url pointing to a local or remote package.
 */
export type PackageUrl = Brand<string, "PackageUrl">;

const isGit = (version: string): boolean => version.startsWith("git");

const isHttp = (version: string): boolean => version.startsWith("http");

const isLocal = (version: string): boolean => version.startsWith("file");

/**
 * Checks if a version is a package-url.
 * @param version The version.
 */
export const isPackageUrl = (version: string): version is PackageUrl =>
  isGit(version) || isHttp(version) || isLocal(version);
