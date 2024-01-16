import { DomainName } from "./domain-name";
import { SemanticVersion } from "./semantic-version";
import { Maintainer } from "@npm/types";

type MajorMinor = `${number}.${number}`;

/**
 * A package sample.
 * @see https://docs.unity3d.com/Manual/cus-samples.html
 */
type Sample = {
  /**
   * The name of the sample as it appears in the package details on the
   * Package Manager window.
   */
  displayName: string;
  /**
   * A brief description of what the sample demonstrates or contains.
   * This is just for the package manifest.
   */
  description: string;
  /**
   * The path from the Samples~ folder to the sample’s root folder.
   */
  path: string;
};

/**
 * The content of a `package.json` file for a Unity package.
 * @see https://docs.unity3d.com/Manual/upm-manifestPkg.html
 */
export type UnityPackageManifest = Readonly<{
  /**
   * A unique identifier that conforms to the Unity Package Manager naming
   * convention, which uses reverse domain name notation.
   */
  name: DomainName;
  /**
   * The package version number (MAJOR.MINOR.PATCH).
   */
  version: SemanticVersion;
  /**
   * A brief description of the package.
   */
  description?: string;
  /**
   * A user-friendly name to appear in the Unity Editor.
   */
  displayName?: string;
  /**
   * Indicates the lowest Unity version the package is compatible with.
   * If omitted, the Package Manager considers the package compatible with
   * all Unity versions.
   */
  unity?: MajorMinor;
  /**
   * The author of the package.
   */
  author?: Maintainer;
  /**
   * Custom location for this package’s changelog specified as a URL.
   */
  changelogUrl?: string;
  /**
   * A map of package dependencies. Keys are package names, and values are
   * specific versions.
   */
  dependencies?: Record<DomainName, SemanticVersion>;
  /**
   * Custom location for this package’s documentation specified as a URL.
   */
  documentationUrl?: string;
  /**
   * By default, a package’s assets are hidden in the Project window and
   * omitted from the results when you use the Object Picker in the Inspector
   * window. Set this property to “false” to make sure that this package’s
   * assets are always visible.
   */
  hideInEditor?: boolean;
  /**
   * An array of keywords used by the Package Manager search APIs.
   */
  keywords?: Array<string>;
  /**
   * Identifier for an OSS license using the SPDX identifier format, or a
   * string such as “See LICENSE.md file”.
   */
  license?: string;
  /**
   * Custom location for this package’s license information specified as a URL.
   */
  licenseUrl?: string;
  /**
   * List of samples included in the package.
   */
  samples?: Array<Sample>;
  /**
   * A constant that provides additional information to the Package Manager.
   */
  type?: string;
  /**
   * Part of a Unity version indicating the specific release of Unity that the
   * package is compatible with.
   */
  unityRelease?: string;
}>;
