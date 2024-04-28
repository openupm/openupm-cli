import { buildPackument } from "../domain/data-packument";
import {
  NoVersionsError,
  tryResolveFromPackument,
  VersionNotFoundError,
} from "../../src/packument-resolving";
import { exampleRegistryUrl } from "../domain/data-registry";
import { makeDomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";

const somePackage = makeDomainName("com.some.package");
const otherPackage = makeDomainName("com.other.package");
const someHighVersion = makeSemanticVersion("2.0.0");
const someLowVersion = makeSemanticVersion("1.0.0");
const someSource = exampleRegistryUrl;
const somePackument = buildPackument(somePackage, (packument) =>
  packument
    .addVersion(someLowVersion, (version) =>
      version.addDependency(otherPackage, someLowVersion)
    )
    .addVersion(someHighVersion, (version) =>
      version.addDependency(otherPackage, someHighVersion)
    )
);

describe("packument resolving", () => {
  describe("resolve version from packument", () => {
    it("should fail it packument has no versions", () => {
      const emptyPackument = buildPackument(somePackage);

      const result = tryResolveFromPackument(
        emptyPackument,
        "latest",
        someSource
      );

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(NoVersionsError)
      );
    });

    it("should find latest version when requested", () => {
      const result = tryResolveFromPackument(
        somePackument,
        "latest",
        someSource
      );

      expect(result).toBeOk((value) =>
        expect(value).toMatchObject({
          packument: somePackument,
          packumentVersion: somePackument.versions[someHighVersion]!,
          source: someSource,
        })
      );
    });

    it("should find latest version when requesting no particular version", () => {
      const result = tryResolveFromPackument(
        somePackument,
        undefined,
        someSource
      );

      expect(result).toBeOk((value) =>
        expect(value).toMatchObject({
          packument: somePackument,
          packumentVersion: somePackument.versions[someHighVersion]!,
          source: someSource,
        })
      );
    });

    it("should find specific version", () => {
      const result = tryResolveFromPackument(
        somePackument,
        someLowVersion,
        someSource
      );

      expect(result).toBeOk((value) =>
        expect(value).toMatchObject({
          packument: somePackument,
          packumentVersion: somePackument.versions[someLowVersion]!,
          source: someSource,
        })
      );
    });

    it("should fail if version is not found", () => {
      const someNonExistentVersion = makeSemanticVersion("3.0.0");

      const result = tryResolveFromPackument(
        somePackument,
        someNonExistentVersion,
        someSource
      );

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(VersionNotFoundError)
      );
    });
  });
});
