import assert from "assert";
import { isDomainName } from "../../src/domain/domain-name";
import { isSemanticVersion } from "../../src/domain/semantic-version";
import { addScope, makeScopedRegistry } from "../../src/domain/scoped-registry";
import {
  addDependency,
  addTestable,
  emptyProjectManifest,
  mapScopedRegistry,
  UnityProjectManifest,
} from "../../src/domain/project-manifest";
import { exampleRegistryUrl } from "./data-registry";

/**
 * Builder class for {@link UnityProjectManifest}.
 */
class UnityProjectManifestBuilder {
  manifest: UnityProjectManifest;

  constructor() {
    this.manifest = emptyProjectManifest;
  }

  /**
   * Add a scope to the manifests scoped registry.
   * @param name The name of the scope.
   */
  addScope(name: string): UnityProjectManifestBuilder {
    assert(isDomainName(name), `${name} is domain name`);

    this.manifest = mapScopedRegistry(
      this.manifest,
      exampleRegistryUrl,
      (registry) => {
        if (registry === null)
          registry = makeScopedRegistry("example.com", exampleRegistryUrl);
        return addScope(registry, name);
      }
    );

    return this;
  }

  /**
   * Add a testable to the manifest.
   * @param name The packages name.
   */
  addTestable(name: string): UnityProjectManifestBuilder {
    assert(isDomainName(name), `${name} is domain name`);
    this.manifest = addTestable(this.manifest, name);
    return this;
  }

  /**
   * Add a dependency to the manifests scoped registry.
   * @param name The packages name.
   * @param version The packages version.
   * @param withScope Whether to also add the package to the scope.
   * @param testable Whether to also add the package to the testables.
   */
  addDependency(
    name: string,
    version: string,
    withScope: boolean,
    testable: boolean
  ): UnityProjectManifestBuilder {
    assert(isDomainName(name), `${name} is domain name`);
    assert(isSemanticVersion(version), `${version} is semantic version`);
    if (withScope) this.addScope(name);
    if (testable) this.addTestable(name);
    this.manifest = addDependency(this.manifest, name, version);
    return this;
  }
}

/**
 * Builder function for {@link UnityProjectManifest}. All dependencies will be put
 * into a default scoped-registry referencing an example registry.
 * @param build A builder function.
 */
export function buildProjectManifest(
  build?: (builder: UnityProjectManifestBuilder) => unknown
) {
  const builder = new UnityProjectManifestBuilder();
  if (build !== undefined) build(builder);
  return builder.manifest;
}
