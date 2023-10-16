import { Logger } from "npmlog";

export type PkgName = string;

export type PkgVersionName = string;

export type Pkg = `${PkgName}@${PkgVersionName}`;

export type Region = "us" | "cn";

export type Registry = string;

export type SemanticVersion = {
  major: number;
  minor: number;
  patch?: number;
  flag?: "a" | "b" | "f";
  flagValue?: 0 | 1 | 2;
  build?: number;
  loc?: string;
  locValue?: number;
  locBuild?: number;
};

export type Auth = {
  alwaysAuth?: boolean;
  _auth?: string;
  username?: string;
  password?: string;
  email?: string;
  token?: string;
};

export type Env = {
  cwd: string;
  color: boolean;
  systemUser: boolean;
  wsl: boolean;
  npmAuth?: Record<Registry, Auth>;
  auth: Record<Registry, Auth>;
  upstream: boolean;
  upstreamRegistry: string;
  registry: string;
  namespace: string;
  editorVersion: string | null;
  region: Region;
  manifestPath: string;
};

export type Dist = {
  tarball: string;
  shasum: string;
  integrity: string;
};

export type PkgVersion = {
  unity: string;
  unityRelease: string;
  dependencies: Record<PkgName, PkgVersionName>;
  license?: string;
  displayName: string;
  description?: string;
  keywords?: string[];
  homepage: string;
  dist?: Dist;
};

export type PkgInfo = {
  name: PkgName;
  versions: Record<PkgVersionName, PkgVersion>;
  "dist-tags": { latest?: PkgVersionName };
  version?: PkgVersionName;
  description?: string;
  keywords?: string[];
  time: Record<"created" | "modified" | PkgVersionName, string>;
  date?: Date;
};

export type NameVersionPair = {
  name: PkgName;
  version: PkgVersionName;
};

export type Dependency = {
  name: PkgName;
  version: PkgVersionName;
  upstream: boolean;
  self: boolean;
  internal: boolean;
  reason: string | null;
  resolved?: boolean;
};

export type ScopedRegistry = {
  name: string;
  url: string;
  scopes: PkgName[];
};

export type PkgManifest = {
  dependencies: Record<PkgName, PkgVersionName>;
  scopedRegistries: ScopedRegistry[];
  testables: string[];
};

export type GlobalOptions = {
  registry?: Registry;
  verbose: boolean;
  color: boolean;
  upstream: boolean;
  cn: boolean;
  systemUser: boolean;
  wsl: boolean;
  chdir: string;
};

export type UPMConfig = {
  npmAuth?: Record<Registry, Auth>;
};

export type NpmFetchOptions = {
  log: Logger;
  registry: Registry;
  alwaysAuth?: boolean;
  email?: string;
  password?: string;
  token?: string;
  username?: string;
};
