import { PkgInfo, PkgVersionInfo } from "../src/types/global";
import assert from "assert";
import { DomainName, isDomainName } from "../src/types/domain-name";
import {
  isSemanticVersion,
  SemanticVersion,
} from "../src/types/semantic-version";

/**
 * Builder class for {@link PkgVersionInfo}
 */
class VersionInfoBuilder {
  readonly version: PkgVersionInfo;

  constructor(name: DomainName, version: SemanticVersion) {
    this.version = {
      name,
      _id: `${name}@${version}`,
      version,
      dependencies: {},
      contributors: [],
    };
  }

  /**
   * Add a dependency to this version
   * @param name The name of the dependency
   * @param version The version
   */
  addDependency(name: string, version: string): VersionInfoBuilder {
    assert(isDomainName(name), `${name} is domain name`);
    assert(isSemanticVersion(version), `${version} is semantic version`);
    this.version.dependencies![name] = version;
    return this;
  }

  /**
   * Set an arbitrary value on the version
   * @param key The key
   * @param value The value
   */
  set<
    TKey extends keyof Omit<
      PkgVersionInfo,
      "version" | "name" | "dependencies" | "_id"
    >
  >(key: TKey, value: PkgVersionInfo[TKey]): VersionInfoBuilder {
    this.version[key] = value;
    return this;
  }
}

/**
 * Builder class for {@link PkgInfo}
 */
class PackageInfoBuilder {
  readonly package: PkgInfo;

  constructor(name: DomainName) {
    this.package = {
      name,
      _id: name,
      versions: {},
      time: {},
      users: {},
      _attachments: {},
    };
  }

  /**
   * Adds a version to this package
   * @param version The name of the version
   * @param build A builder function
   */
  addVersion(
    version: string,
    build?: (builder: VersionInfoBuilder) => unknown
  ): PackageInfoBuilder {
    assert(isSemanticVersion(version), `${version} is semantic version`);
    const builder = new VersionInfoBuilder(this.package.name, version);
    if (build !== undefined) build(builder);
    this.package.versions[version] = builder.version;
    this.package["dist-tags"] = {
      latest: version,
    };
    return this;
  }

  set<
    TKey extends keyof Omit<
      PkgInfo,
      "name" | "version" | "versions" | "dist-tags" | "_id"
    >
  >(key: TKey, value: PkgInfo[TKey]): PackageInfoBuilder {
    this.package[key] = value;
    return this;
  }
}

/**
 * Helper for building a {@link PkgInfo} object. Does validation and also
 * sets repeated properties for you
 * @param name The name of the package
 * @param build A builder function
 */
export function buildPackageInfo(
  name: string,
  build?: (builder: PackageInfoBuilder) => unknown
): PkgInfo {
  assert(isDomainName(name), `${name} is domain name`);
  const builder = new PackageInfoBuilder(name);
  if (build !== undefined) build(builder);
  return builder.package;
}
