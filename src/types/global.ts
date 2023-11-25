import { DomainName } from "./domain-name";
import { SemanticVersion } from "./semantic-version";
import { PackageId } from "./package-id";

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
