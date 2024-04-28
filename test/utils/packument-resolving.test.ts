import { buildPackument } from "../domain/data-packument";
import {
  NoVersionsError,
  tryResolvePackumentVersion,
  VersionNotFoundError,
} from "../../src/packument-resolving";
import { makeDomainName } from "../../src/domain/domain-name";
import { makeSemanticVersion } from "../../src/domain/semantic-version";

const somePackage = makeDomainName("com.some.package");
const otherPackage = makeDomainName("com.other.package");
const someHighVersion = makeSemanticVersion("2.0.0");
const someLowVersion = makeSemanticVersion("1.0.0");
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

      const result = tryResolvePackumentVersion(emptyPackument, "latest");

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(NoVersionsError)
      );
    });

    it("should find latest version when requested", () => {
      const result = tryResolvePackumentVersion(somePackument, "latest");

      expect(result).toBeOk((value) =>
        expect(value).toEqual(somePackument.versions[someHighVersion]!)
      );
    });

    it("should find latest version when requesting no particular version", () => {
      const result = tryResolvePackumentVersion(somePackument, undefined);

      expect(result).toBeOk((value) =>
        expect(value).toEqual(somePackument.versions[someHighVersion]!)
      );
    });

    it("should find specific version", () => {
      const result = tryResolvePackumentVersion(somePackument, someLowVersion);

      expect(result).toBeOk((value) =>
        expect(value).toEqual(somePackument.versions[someLowVersion]!)
      );
    });

    it("should fail if version is not found", () => {
      const someNonExistentVersion = makeSemanticVersion("3.0.0");

      const result = tryResolvePackumentVersion(
        somePackument,
        someNonExistentVersion
      );

      expect(result).toBeError((error) =>
        expect(error).toBeInstanceOf(VersionNotFoundError)
      );
    });
  });
});
