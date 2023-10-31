import { PkgVersion } from "../types/global";

const isGit = (version: PkgVersion): boolean => version.startsWith("git");
const isHttp = (version: PkgVersion): boolean => version.startsWith("http");

const isLocal = (version: PkgVersion): boolean => version.startsWith("file");

export const isUrlVersion = (version: PkgVersion): boolean =>
  isGit(version) || isHttp(version) || isLocal(version);
