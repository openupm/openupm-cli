import { SemanticVersion } from "../../../src/domain/semantic-version";
import { addScope, makeScopedRegistry } from "../../../src/domain/scoped-registry";
import {
  addTestable,
  emptyProjectManifest,
  mapScopedRegistry,
  setDependency,
  UnityProjectManifest,
} from "../../../src/domain/project-manifest";
import { exampleRegistryUrl } from "./data-registry";
import { assertZod } from "../../../src/utils/zod-utils";
import { DomainName } from "../../../src/domain/domain-name";

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
    assertZod(name, DomainName);

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
    assertZod(name, DomainName);
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
    assertZod(name, DomainName);
    assertZod(version, SemanticVersion);
    if (withScope) this.addScope(name);
    if (testable) this.addTestable(name);
    this.manifest = setDependency(this.manifest, name, version);
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
