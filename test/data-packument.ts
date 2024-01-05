import assert from "assert";
import { DomainName, isDomainName } from "../src/types/domain-name";
import {
  isSemanticVersion,
  SemanticVersion,
} from "../src/types/semantic-version";
import { packageId } from "../src/types/package-id";
import { UnityPackument, UnityPackumentVersion } from "../src/types/packument";

/**
 * Builder class for {@link UnityPackumentVersion}
 */
class UnityPackumentVersionBuilder {
  readonly version: UnityPackumentVersion;

  constructor(name: DomainName, version: SemanticVersion) {
    this.version = {
      name,
      _id: packageId(name, version),
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
  addDependency(name: string, version: string): UnityPackumentVersionBuilder {
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
      UnityPackumentVersion,
      "version" | "name" | "dependencies" | "_id"
    >
  >(
    key: TKey,
    value: UnityPackumentVersion[TKey]
  ): UnityPackumentVersionBuilder {
    this.version[key] = value;
    return this;
  }
}

/**
 * Builder class for {@link UnityPackument}
 */
class UnityPackumentBuilder {
  readonly packument: UnityPackument;

  constructor(name: DomainName) {
    this.packument = {
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
    build?: (builder: UnityPackumentVersionBuilder) => unknown
  ): UnityPackumentBuilder {
    assert(isSemanticVersion(version), `${version} is semantic version`);
    const builder = new UnityPackumentVersionBuilder(
      this.packument.name,
      version
    );
    if (build !== undefined) build(builder);
    this.packument.versions[version] = builder.version;
    this.packument["dist-tags"] = {
      latest: version,
    };
    return this;
  }

  set<
    TKey extends keyof Omit<
      UnityPackument,
      "name" | "version" | "versions" | "dist-tags" | "_id"
    >
  >(key: TKey, value: UnityPackument[TKey]): UnityPackumentBuilder {
    this.packument[key] = value;
    return this;
  }
}

/**
 * Helper for building a {@link UnityPackument} object. Does validation and also
 * sets repeated properties for you
 * @param name The name of the package
 * @param build A builder function
 */
export function buildPackument(
  name: string,
  build?: (builder: UnityPackumentBuilder) => unknown
): UnityPackument {
  assert(isDomainName(name), `${name} is domain name`);
  const builder = new UnityPackumentBuilder(name);
  if (build !== undefined) build(builder);
  return builder.packument;
}