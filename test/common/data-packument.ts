import assert from "assert";
import { DomainName } from "../../src/domain/domain-name";
import {
  UnityPackument,
  UnityPackumentVersion,
} from "../../src/domain/packument";
import { SemanticVersion } from "../../src/domain/semantic-version";
import { isZod } from "../../src/domain/zod-utils";

/**
 * Builder class for {@link UnityPackumentVersion}.
 */
class UnityPackumentVersionBuilder {
  version: UnityPackumentVersion;

  constructor(name: DomainName, version: SemanticVersion) {
    this.version = {
      name,
      version,
      dependencies: {},
    };
  }

  /**
   * Add a dependency to this version.
   * @param name The name of the dependency.
   * @param version The version.
   */
  addDependency(name: string, version: string): UnityPackumentVersionBuilder {
    assert(isZod(name, DomainName), `${name} is domain name`);
    assert(isZod(version, SemanticVersion), `${version} is semantic version`);
    this.version = {
      ...this.version,
      dependencies: {
        ...this.version.dependencies,
        [name]: version,
      },
    };
    return this;
  }

  /**
   * Set an arbitrary value on the version.
   * @param key The key.
   * @param value The value.
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
    this.version = { ...this.version, [key]: value };
    return this;
  }
}

/**
 * Builder class for {@link UnityPackument}.
 */
class UnityPackumentBuilder {
  packument: UnityPackument;

  constructor(name: DomainName) {
    this.packument = {
      name,
      versions: {},
      time: {},
    };
  }

  /**
   * Adds a version to this package.
   * @param version The name of the version.
   * @param build A builder function.
   */
  addVersion(
    version: string,
    build?: (builder: UnityPackumentVersionBuilder) => unknown
  ): UnityPackumentBuilder {
    assert(isZod(version, SemanticVersion), `${version} is semantic version`);
    const builder = new UnityPackumentVersionBuilder(
      this.packument.name,
      version
    );
    if (build !== undefined) build(builder);
    this.packument = {
      ...this.packument,
      versions: {
        ...this.packument.versions,
        [version]: builder.version,
      },
      "dist-tags": {
        latest: version,
      },
    };
    return this;
  }

  set<
    TKey extends keyof Omit<
      UnityPackument,
      "name" | "version" | "versions" | "dist-tags" | "_id"
    >
  >(key: TKey, value: UnityPackument[TKey]): UnityPackumentBuilder {
    this.packument = { ...this.packument, [key]: value };
    return this;
  }
}

/**
 * Helper for building a {@link UnityPackument} object. Does validation and also
 * sets repeated properties for you.
 * @param name The name of the package.
 * @param build A builder function.
 */
export function buildPackument(
  name: string,
  build?: (builder: UnityPackumentBuilder) => unknown
): UnityPackument {
  assert(isZod(name, DomainName));
  const builder = new UnityPackumentBuilder(name);
  if (build !== undefined) build(builder);
  return builder.packument;
}
