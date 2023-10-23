import { Logger } from "npmlog";
import { NpmAuth } from "another-npm-registry-client";

declare global {
  type PkgName = string;

  type PkgVersionName = string;

  type Pkg = `${PkgName}@${PkgVersionName}`;

  type Region = "us" | "cn";

  type Registry = string;

  type SemanticVersion = {
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

  type Env = {
    cwd: string;
    color: boolean;
    systemUser: boolean;
    wsl: boolean;
    npmAuth?: Record<Registry, NpmAuth>;
    auth: Record<Registry, NpmAuth>;
    upstream: boolean;
    upstreamRegistry: string;
    registry: string;
    namespace: string;
    editorVersion: string | null;
    region: Region;
    manifestPath: string;
  };

  type Dist = {
    tarball: string;
    shasum: string;
    integrity: string;
  };

  type PkgVersion = {
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

  type PkgInfo = {
    name: PkgName;
    versions: Record<PkgVersionName, PkgVersion>;
    "dist-tags": { latest?: PkgVersionName };
    version?: PkgVersionName;
    description?: string;
    keywords?: string[];
    time: Record<"created" | "modified" | PkgVersionName, string>;
    date?: Date;
  };

  type NameVersionPair = {
    name: PkgName;
    version: PkgVersionName;
  };

  type Dependency = {
    name: PkgName;
    version: PkgVersionName;
    upstream: boolean;
    self: boolean;
    internal: boolean;
    reason: string | null;
    resolved?: boolean;
  };

  type ScopedRegistry = {
    name: string;
    url: string;
    scopes: PkgName[];
  };

  type PkgManifest = {
    dependencies: Record<PkgName, PkgVersionName>;
    scopedRegistries: ScopedRegistry[];
    testables: string[];
  };

  type GlobalOptions = {
    registry?: Registry;
    verbose: boolean;
    color: boolean;
    upstream: boolean;
    cn: boolean;
    systemUser: boolean;
    wsl: boolean;
    chdir: string;
  };

  type UpmAuth = {
    email: string;
    alwaysAuth: boolean;
  } & ({ token: string } | { _auth: string });

  type UPMConfig = {
    npmAuth?: Record<Registry, UpmAuth>;
  };
}
