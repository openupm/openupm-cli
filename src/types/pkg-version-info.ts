import { PackageId } from "./package-id";
import { SemanticVersion } from "./semantic-version";
import { DomainName } from "./domain-name";
import { Dist, Maintainer } from "@npm/types";

/**
 * Contains information about a specific version of a package. This is based on
 * the information contained inside a Unity package manifest, with some
 * additions.
 * @see https://docs.unity3d.com/Manual/upm-manifestPkg.html
 */
export type PkgVersionInfo = {
  /**
   * Same as {@link name}
   */
  _id?: PackageId;
  _nodeVersion?: string;
  _npmVersion?: string;
  _rev?: string;
  /**
   * The package name
   */
  name: string;
  /**
   * The version
   */
  version: SemanticVersion;
  /**
   * Indicates the lowest Unity version the package is compatible with.
   * The expected format is "<MAJOR>.<MINOR>".
   * @example 2020.2
   */
  unity?: `${number}.${number}`;
  /**
   * Part of a Unity version indicating the specific release of Unity that the
   * package is compatible with.
   * The expected format is "<UPDATE><RELEASE>".
   * @example 0b4
   */
  unityRelease?: string;
  /**
   * A map of package dependencies. Keys are package names, and values are
   * specific versions.
   */
  dependencies?: Record<DomainName, SemanticVersion>;
  /**
   * Identifier for an OSS license using the SPDX identifier format.
   */
  license?: string;
  /**
   * A user-friendly name to appear in the Unity Editor.
   */
  displayName?: string;
  /**
   * A brief description of the package.
   */
  description?: string;
  /**
   * An array of keywords used by the Package Manager search APIs.
   */
  keywords?: string[];
  homepage?: string;
  category?: string;
  gitHead?: string;
  readmeFilename?: string;
  /**
   * The author of the package.
   */
  author?: Maintainer;
  contributors?: Maintainer[];
  dist?: Dist;
};
