import { AssertionError } from "assert";
import { DomainName } from "../../src/domain/domain-name.js";
import { PackageUrl } from "../../src/domain/package-url.js";
import {
  addTestable,
  emptyProjectManifest,
  mapScopedRegistry,
  setDependency,
  UnityProjectManifest,
  type DependencyVersion,
} from "../../src/domain/project-manifest.js";
import { addScope, makeScopedRegistry } from "../../src/domain/scoped-registry.js";
import { SemanticVersion } from "../../src/domain/semantic-version.js";
import { assertZod, isZod } from "../../src/domain/zod-utils.js";
import { someRegistryUrl } from "./data-registry.js";

function assertIsDependencyVersion(x: unknown): asserts x is DependencyVersion {
  if (!isZod(x, SemanticVersion) && !isZod(x, PackageUrl))
    throw new AssertionError({
      message: "Value is not a dependency version",
      actual: x,
      expected: "Some dependency version.",
    });
}

/**
 * Builder class for {@link UnityProjectManifest}.
 */
export class UnityProjectManifestBuilder {
  private constructor(public readonly manifest: UnityProjectManifest) {}

  public static empty = new UnityProjectManifestBuilder(emptyProjectManifest);

  /**
   * Add a scope to the manifests scoped registry.
   * @param name The name of the scope.
   */
  addScope(name: string): UnityProjectManifestBuilder {
    assertZod(name, DomainName);

    return new UnityProjectManifestBuilder(
      mapScopedRegistry(this.manifest, someRegistryUrl, (registry) => {
        if (registry === null)
          registry = makeScopedRegistry(
            new URL(someRegistryUrl).hostname,
            someRegistryUrl
          );
        return addScope(registry, name);
      })
    );
  }

  /**
   * Add a testable to the manifest.
   * @param name The packages name.
   */
  addTestable(name: string): UnityProjectManifestBuilder {
    assertZod(name, DomainName);
    return new UnityProjectManifestBuilder(addTestable(this.manifest, name));
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
    assertIsDependencyVersion(version);

    let updated: UnityProjectManifestBuilder = new UnityProjectManifestBuilder(
      setDependency(this.manifest, name, version)
    );
    if (withScope) updated = updated.addScope(name);
    if (testable) updated = updated.addTestable(name);
    return updated;
  }
}

/**
 * Builder function for {@link UnityProjectManifest}. All dependencies will be put
 * into a default scoped-registry referencing an example registry.
 * @param build A builder function.
 */
export function buildProjectManifest(
  build?: (builder: UnityProjectManifestBuilder) => UnityProjectManifestBuilder
) {
  let builder = UnityProjectManifestBuilder.empty;
  if (build !== undefined) builder = build(builder);
  return builder.manifest;
}
