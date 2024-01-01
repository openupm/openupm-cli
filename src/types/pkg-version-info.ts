import { PackageId } from "./package-id";
import { Dist, Maintainer } from "@npm/types";
import { UnityPackageManifest } from "./unity-package-manifest";

/**
 * Contains information about a specific version of a package. This is based on
 * the information contained inside a Unity package manifest, with some
 * additions.
 */
export type PkgVersionInfo = UnityPackageManifest & {
  /**
   * Same as {@link name}
   */
  _id?: PackageId;
  _nodeVersion?: string;
  _npmVersion?: string;
  _rev?: string;
  homepage?: string;
  category?: string;
  gitHead?: string;
  readmeFilename?: string;
  contributors?: Maintainer[];
  dist?: Dist;
};
