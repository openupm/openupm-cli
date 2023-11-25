import { NpmAuth } from "another-npm-registry-client";
import { IpAddress } from "./ip-address";
import { DomainName } from "./domain-name";
import { PackageUrl } from "./package-url";
import { SemanticVersion } from "./semantic-version";
import { PackageId } from "./package-id";
import { RegistryUrl } from "./registry-url";

export type Region = "us" | "cn";

export type Env = {
  cwd: string;
  color: boolean;
  systemUser: boolean;
  wsl: boolean;
  npmAuth?: Record<RegistryUrl, UpmAuth>;
  auth: Record<RegistryUrl, NpmAuth>;
  upstream: boolean;
  upstreamRegistry: RegistryUrl;
  registry: RegistryUrl;
  namespace: DomainName | IpAddress;
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
  _id?: PackageId;
  _nodeVersion?: string;
  _npmVersion?: string;
  _rev?: string;
  name: string;
  version: SemanticVersion;
  unity?: string;
  unityRelease?: string;
  dependencies?: Record<DomainName, SemanticVersion>;
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
  name: DomainName;
  _id?: DomainName;
  _rev?: string;
  _attachments?: Record<string, unknown>;
  readme?: string;
  versions: Record<SemanticVersion, PkgVersionInfo>;
  "dist-tags"?: { latest?: SemanticVersion };
  version?: SemanticVersion;
  description?: string;
  keywords?: string[];
  time: {
    [key: SemanticVersion]: string;
    created?: string;
    modified?: string;
  };
  date?: Date;
  users?: Record<string, unknown>;
};

export type NameVersionPair = {
  name: DomainName;
  version: SemanticVersion | "latest" | undefined;
};

export type Dependency = {
  name: DomainName;
  version?: SemanticVersion;
  upstream: boolean;
  self: boolean;
  internal: boolean;
  reason: string | null;
  resolved?: boolean;
};

export type ScopedRegistry = {
  name: string;
  url: RegistryUrl;
  scopes: DomainName[];
};

export type PkgManifest = {
  dependencies: Record<DomainName, SemanticVersion | PackageUrl>;
  scopedRegistries?: ScopedRegistry[];
  testables?: string[];
};

export type GlobalOptions = {
  registry?: string;
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
  npmAuth?: Record<RegistryUrl, UpmAuth>;
};
