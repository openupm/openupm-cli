const isGit = (versionName: PkgVersionName): boolean =>
  versionName.startsWith("git");
const isHttp = (versionName: PkgVersionName): boolean =>
  versionName.startsWith("http");

const isLocal = (versionName: PkgVersionName): boolean =>
  versionName.startsWith("file");

export const isUrlVersion = (versionName: PkgVersionName): boolean =>
  isGit(versionName) || isHttp(versionName) || isLocal(versionName);
