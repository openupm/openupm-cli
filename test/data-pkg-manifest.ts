import { PkgManifest } from "../src/types/global";
import assert from "assert";
import { domainName, isDomainName } from "../src/types/domain-name";
import { exampleRegistryUrl } from "./mock-registry";
import { isSemanticVersion } from "../src/types/semantic-version";

/**
 * Builder class for {@link PkgManifest}
 */
class PkgManifestBuilder {
  readonly manifest: PkgManifest;

  constructor() {
    this.manifest = {
      dependencies: {},
    };
  }

  /**
   * Add a scope to the manifests scoped registry
   * @param name The name of the scope
   */
  addScope(name: string): PkgManifestBuilder {
    assert(isDomainName(name), `${name} is domain name`);

    if (this.manifest.scopedRegistries === undefined)
      this.manifest.scopedRegistries = [
        {
          name: "example.com",
          scopes: [domainName("com.example")],
          url: exampleRegistryUrl,
        },
      ];

    const registry = this.manifest.scopedRegistries![0];
    registry.scopes = [name, ...registry.scopes];
    registry.scopes.sort();

    return this;
  }

  /**
   * Add a testable to the manifest
   * @param name The packages name
   */
  addTestable(name: string): PkgManifestBuilder {
    assert(isDomainName(name), `${name} is domain name`);
    if (this.manifest.testables === undefined) this.manifest.testables = [];
    this.manifest.testables.push(name);
    this.manifest.testables.sort();
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
    this.manifest.dependencies[name] = version;
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
