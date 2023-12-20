import assert from "assert";
import { isDomainName } from "../src/types/domain-name";
import { exampleRegistryUrl } from "./mock-registry";
import { isSemanticVersion } from "../src/types/semantic-version";
import { addScope, scopedRegistry } from "../src/types/scoped-registry";
import {
  addDependency,
  addTestable,
  emptyPackageManifest,
  PkgManifest,
} from "../src/types/pkg-manifest";

/**
 * Builder class for {@link PkgManifest}
 */
class PkgManifestBuilder {
  readonly manifest: PkgManifest;

  constructor() {
    this.manifest = emptyPackageManifest();
  }

  /**
   * Add a scope to the manifests scoped registry
   * @param name The name of the scope
   */
  addScope(name: string): PkgManifestBuilder {
    assert(isDomainName(name), `${name} is domain name`);

    if (this.manifest.scopedRegistries === undefined)
      this.manifest.scopedRegistries = [
        scopedRegistry("example.com", exampleRegistryUrl),
      ];

    const registry = this.manifest.scopedRegistries![0];
    addScope(registry, name);

    return this;
  }

  /**
   * Add a testable to the manifest
   * @param name The packages name
   */
  addTestable(name: string): PkgManifestBuilder {
    assert(isDomainName(name), `${name} is domain name`);
    addTestable(this.manifest, name);
    return this;
  }

  /**
   * Add a dependency to the manifests scoped registry
   * @param name The packages name
   * @param version The packages version
   * @param withScope Whether to also add the package to the scope
   * @param testable Whether to also add the package to the testables
   */
  addDependency(
    name: string,
    version: string,
    withScope: boolean,
    testable: boolean
  ): PkgManifestBuilder {
    assert(isDomainName(name), `${name} is domain name`);
    assert(isSemanticVersion(version), `${version} is semantic version`);
    if (withScope) this.addScope(name);
    if (testable) this.addTestable(name);
    addDependency(this.manifest, name, version);
    return this;
  }
}

/**
 * Builder function for {@link PkgManifest}. All dependencies will be put
 * into a default scoped-registry referencing an example registry
 * @param build A builder function.
 */
export function buildPackageManifest(
  build?: (builder: PkgManifestBuilder) => unknown
) {
  const builder = new PkgManifestBuilder();
  if (build !== undefined) build(builder);
  return builder.manifest;
}
