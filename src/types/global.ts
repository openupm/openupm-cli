import { NpmAuth } from "another-npm-registry-client";

export type PkgVersion = string;

export type ReverseDomainName = string;

export type PkgName = ReverseDomainName | `${ReverseDomainName}@${PkgVersion}`;

export type Region = "us" | "cn";

export type Registry = string;

export type EditorVersion = {
  major: number;
  minor: number;
  patch?: number;
  flag?: "a" | "b" | "f" | "c";
  flagValue?: 0 | 1 | 2;
  build?: number;
  loc?: string;
  locValue?: number;
  locBuild?: number;
};

export type Env = {
  cwd: string;
  color: boolean;
  systemUser: boolean;
  wsl: boolean;
  npmAuth?: Record<Registry, UpmAuth>;
  auth: Record<Registry, NpmAuth>;
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

export type Contact = {
  name: string;
  email?: string;
  url?: string;
};

export type PkgVersionInfo = {
  _id?: PkgName;
  _nodeVersion?: string;
  _npmVersion?: string;
  _rev?: string;
  name: string;
  version: string;
  unity?: string;
  unityRelease?: string;
  dependencies?: Record<PkgName, PkgVersion>;
  license?: string;
  displayName?: string;
  description?: string;
  keywords?: string[];
  homepage?: string;
  category?: string;
  gitHead?: string;
  readmeFilename?: string;
  author?: Contact;
  contributors?: Contact[];
  dist?: Dist;
};

export type PkgInfo = {
  name: PkgName;
  _id?: PkgName;
  _rev?: string;
  _attachments?: Record<string, unknown>;
  readme?: string;
  versions: Record<PkgVersion, PkgVersionInfo>;
  "dist-tags"?: { latest?: PkgVersion };
  version?: PkgVersion;
  description?: string;
  keywords?: string[];
  time: Record<"created" | "modified" | PkgVersion, string>;
  date?: Date;
  users?: Record<string, unknown>;
};

export type NameVersionPair = {
  name: PkgName;
  version: PkgVersion | undefined;
};

export type Dependency = {
  name: PkgName;
  version: PkgVersion;
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
  dependencies: Record<PkgName, PkgVersion>;
  scopedRegistries?: ScopedRegistry[];
  testables?: string[];
};

export type GlobalOptions = {
  registry?: Registry;
  verbose?: boolean;
  color?: boolean;
  upstream?: boolean;
  cn?: boolean;
  systemUser?: boolean;
  wsl?: boolean;
  chdir?: string;
};

export type UpmAuth = {
  email: string;
  alwaysAuth: boolean;
} & ({ token: string } | { _auth: string });

export type UPMConfig = {
  npmAuth?: Record<Registry, UpmAuth>;
};
