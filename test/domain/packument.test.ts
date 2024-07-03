import {
  NoVersionsError,
  tryGetLatestVersion,
  tryGetPackumentVersion,
  tryResolvePackumentVersion,
  VersionNotFoundError,
} from "../../src/domain/packument";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { buildPackument } from "./data-packument";
import { makeDomainName } from "../../src/domain/domain-name";

describe("packument", () => {
  describe("get latest version", () => {
    it("should first get version from dist-tags", async () => {
      const packument = {
        "dist-tags": { latest: makeSemanticVersion("1.0.0") },
      };

      const version = tryGetLatestVersion(packument);

      expect(version).toEqual("1.0.0");
    });

    it("should then get version from version property", async () => {
      const packument = {
        version: makeSemanticVersion("1.0.0"),
      };

      const version = tryGetLatestVersion(packument);

      expect(version).toEqual("1.0.0");
    });

    it("should be undefined if version can not be found", () => {
      const packument = {};

      const version = tryGetLatestVersion(packument);

      expect(version).toBeUndefined();
    });
  });

  describe("get version", () => {
    it("should find existing packument version", () => {
      const version = makeSemanticVersion("1.0.0");
      const packument = buildPackument("com.some.package", (packument) =>
        packument.addVersion(version)
      );

      const packumentVersion = tryGetPackumentVersion(packument, version);

      expect(packumentVersion).not.toBeNull();
    });

    it("should not find missing packument version", () => {
      const version = makeSemanticVersion("1.0.0");
      const packument = buildPackument("com.some.package");

      const packumentVersion = tryGetPackumentVersion(packument, version);

      expect(packumentVersion).toBeNull();
    });
  });

  describe("resolve version", () => {
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

    it("should fail it packument has no versions", () => {
      const emptyPackument = buildPackument(somePackage);

      expect(() =>
        tryResolvePackumentVersion(emptyPackument, "latest")
      ).toThrow(NoVersionsError);
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
