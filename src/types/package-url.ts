import { Brand } from "ts-brand";

/**
 * A string of an url pointing to a local or remote package
 */
export type PackageUrl = Brand<string, "PackageUrl">;

function isGit(version: string): boolean {
  return version.startsWith("git");
}

function isHttp(version: string): boolean {
  return version.startsWith("http");
}

function isLocal(version: string): boolean {
  return version.startsWith("file");
}

/**
 * Checks if a version is a package-url
 * @param version The version
 */
export function isPackageUrl(version: string): version is PackageUrl {
  return isGit(version) || isHttp(version) || isLocal(version);
}
