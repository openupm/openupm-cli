import { DomainName } from "./domain-name";
import { PackageUrl } from "./package-url";
import { SemanticVersion } from "./semantic-version";
import { PackageId } from "./package-id";
import { RegistryUrl } from "./registry-url";

export type Region = "us" | "cn";

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
