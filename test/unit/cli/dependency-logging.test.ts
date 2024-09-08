import {
  makeGraphFromSeed,
  markBuiltInResolved,
  markFailed,
  markRemoteResolved,
} from "../../../src/domain/dependency-graph";
import { stringifyDependencyGraph } from "../../../src/cli/dependency-logging";
import { makePackageReference } from "../../../src/domain/package-reference";
import { exampleRegistryUrl } from "../../common/data-registry";
import { PackumentNotFoundError } from "../../../src/domain/common-errors";
import { unityRegistryUrl } from "../../../src/domain/registry-url";
import { VersionNotFoundError } from "../../../src/domain/packument";
import { DomainName } from "../../../src/domain/domain-name";
import { SemanticVersion } from "../../../src/domain/semantic-version";

describe("dependency-logging", () => {
  describe("graph", () => {
    const somePackage = DomainName.parse("com.some.package");
    const otherPackage = DomainName.parse("com.other.package");
    const anotherPackage = DomainName.parse("com.another.package");
    const thatPackage = DomainName.parse("com.that.package");

    const someVersion = SemanticVersion.parse("1.2.3");
    const otherVersion = SemanticVersion.parse("2.3.4");

    it("should fail if graph does not contain package", () => {
      const graph = makeGraphFromSeed(somePackage, someVersion);

      expect(() =>
        stringifyDependencyGraph(graph, otherPackage, someVersion)
      ).toThrow(RangeError);
    });

    it("should fail if graph does contain package but not at given version", () => {
      const graph = makeGraphFromSeed(somePackage, someVersion);

      expect(() =>
        stringifyDependencyGraph(graph, somePackage, otherVersion)
      ).toThrow(RangeError);
    });

    it("should output unresolved package in correct format", () => {
      const graph = makeGraphFromSeed(somePackage, someVersion);

      const actual = stringifyDependencyGraph(graph, somePackage, someVersion);

      // Print just name@version
      expect(actual).toEqual([
        `${makePackageReference(somePackage, someVersion)}`,
      ]);
    });

    it("should output resolved package in correct format", () => {
      let graph = makeGraphFromSeed(somePackage, someVersion);
      graph = markRemoteResolved(
        graph,
        somePackage,
        someVersion,
        exampleRegistryUrl,
        {
          [otherPackage]: otherVersion,
          [anotherPackage]: someVersion,
        }
      );

      const actual = stringifyDependencyGraph(graph, somePackage, someVersion);

      // Print name@version plus dependencies in the next lines
      expect(actual).toEqual([
        `${makePackageReference(somePackage, someVersion)}`,
        `└─ ${makePackageReference(otherPackage, otherVersion)}`,
        `└─ ${makePackageReference(anotherPackage, someVersion)}`,
      ]);
    });

    it("should output failed package in correct format", () => {
      let graph = makeGraphFromSeed(somePackage, someVersion);
      graph = markFailed(graph, somePackage, someVersion, {
        [exampleRegistryUrl]: new PackumentNotFoundError(somePackage),
        [unityRegistryUrl]: new VersionNotFoundError(
          somePackage,
          someVersion,
          []
        ),
      });

      const actual = stringifyDependencyGraph(graph, somePackage, someVersion);

      // Print name@version plus error message in next line
      expect(actual).toEqual([
        `${makePackageReference(somePackage, someVersion)}`,
        `  - "${exampleRegistryUrl}": package not found`,
        `  - "${unityRegistryUrl}": version not found`,
      ]);
    });

    it("should print deep graphs in correct format", () => {
      let graph = makeGraphFromSeed(somePackage, someVersion);
      graph = markRemoteResolved(
        graph,
        somePackage,
        someVersion,
        exampleRegistryUrl,
        {
          [otherPackage]: otherVersion,
          [thatPackage]: someVersion,
        }
      );
      graph = markRemoteResolved(
        graph,
        otherPackage,
        otherVersion,
        exampleRegistryUrl,
        {
          [anotherPackage]: someVersion,
        }
      );
      graph = markBuiltInResolved(graph, anotherPackage, someVersion);
      graph = markBuiltInResolved(graph, thatPackage, someVersion);

      const actual = stringifyDependencyGraph(graph, somePackage, someVersion);

      // Print | next to nested trees
      expect(actual).toEqual([
        `${makePackageReference(somePackage, someVersion)}`,
        `└─ ${makePackageReference(otherPackage, otherVersion)}`,
        `│  └─ ${makePackageReference(anotherPackage, someVersion)}`,
        `└─ ${makePackageReference(thatPackage, someVersion)}`,
      ]);
    });

    it("should fully print packages only once (don't print duplicates)", () => {
      let graph = makeGraphFromSeed(somePackage, someVersion);
      graph = markRemoteResolved(
        graph,
        somePackage,
        someVersion,
        exampleRegistryUrl,
        {
          [otherPackage]: otherVersion,
          [anotherPackage]: someVersion,
        }
      );
      graph = markRemoteResolved(
        graph,
        otherPackage,
        otherVersion,
        exampleRegistryUrl,
        { [anotherPackage]: someVersion }
      );
      graph = markRemoteResolved(
        graph,
        anotherPackage,
        someVersion,
        exampleRegistryUrl,
        { [thatPackage]: someVersion }
      );
      graph = markBuiltInResolved(graph, thatPackage, someVersion);

      const actual = stringifyDependencyGraph(graph, somePackage, someVersion);

      expect(actual).toEqual([
        `${makePackageReference(somePackage, someVersion)}`,
        `└─ ${makePackageReference(otherPackage, otherVersion)}`,
        `│  └─ ${makePackageReference(anotherPackage, someVersion)}`,
        `│     └─ ${makePackageReference(thatPackage, someVersion)}`,
        // Because this package was printed before, now only its name is printed
        // with a string at the end that indicates that this is a duplicate.
        `└─ ${makePackageReference(anotherPackage, someVersion)} ..`,
      ]);
    });
  });
});
