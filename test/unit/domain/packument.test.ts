import { Ok } from "ts-results-es";
import { DomainName } from "../../../src/domain/domain-name";
import {
  NoVersionsError,
  packumentHasVersion,
  tryGetLatestVersion,
  tryGetPackumentVersion,
  tryResolvePackumentVersion,
  VersionNotFoundError,
} from "../../../src/domain/packument";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import { buildPackument } from "../../common/data-packument";

describe("packument", () => {
  describe("get latest version", () => {
    it("should first get version from dist-tags", async () => {
      const packument = {
        "dist-tags": { latest: SemanticVersion.parse("1.0.0") },
      };

      const version = tryGetLatestVersion(packument);

      expect(version).toEqual("1.0.0");
    });

    it("should then get version from version property", async () => {
      const packument = {
        version: SemanticVersion.parse("1.0.0"),
      };

      const version = tryGetLatestVersion(packument);

      expect(version).toEqual("1.0.0");
    });

    it("should be undefined if version can not be found", () => {
      const packument = {};

      const version = tryGetLatestVersion(packument);

      expect(version).toBeNull();
    });
  });

  describe("get version", () => {
    it("should find existing packument version", () => {
      const version = SemanticVersion.parse("1.0.0");
      const packument = buildPackument("com.some.package", (packument) =>
        packument.addVersion(version)
      );

      const packumentVersion = tryGetPackumentVersion(packument, version);

      expect(packumentVersion).not.toBeNull();
    });

    it("should not find missing packument version", () => {
      const version = SemanticVersion.parse("1.0.0");
      const packument = buildPackument("com.some.package");

      const packumentVersion = tryGetPackumentVersion(packument, version);

      expect(packumentVersion).toBeNull();
    });
  });

  describe("resolve version", () => {
    const somePackage = DomainName.parse("com.some.package");
    const otherPackage = DomainName.parse("com.other.package");
    const someHighVersion = SemanticVersion.parse("2.0.0");
    const someLowVersion = SemanticVersion.parse("1.0.0");
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

      expect(result).toEqual(Ok(somePackument.versions[someHighVersion]!));
    });

    it("should find latest version when requesting no particular version", () => {
      const result = tryResolvePackumentVersion(somePackument, undefined);

      expect(result).toEqual(Ok(somePackument.versions[someHighVersion]!));
    });

    it("should find specific version", () => {
      const result = tryResolvePackumentVersion(somePackument, someLowVersion);

      expect(result).toEqual(Ok(somePackument.versions[someLowVersion]!));
    });

    it("should fail if version is not found", () => {
      const someNonExistentVersion = SemanticVersion.parse("3.0.0");

      const result = tryResolvePackumentVersion(
        somePackument,
        someNonExistentVersion
      );

      const error = result.unwrapErr();
      expect(error).toBeInstanceOf(VersionNotFoundError);
    });
  });

  describe("has version", () => {
    it("should have version if there is entry for it", () => {
      const packument = buildPackument("com.some.package", (packument) =>
        packument.addVersion("1.0.0")
      );

      const hasVersion = packumentHasVersion(
        packument,
        SemanticVersion.parse("1.0.0")
      );

      expect(hasVersion).toBeTruthy();
    });

    it("should not have version if there is no entry for it", () => {
      const packument = buildPackument("com.some.package", (packument) =>
        packument.addVersion("1.0.0")
      );

      const hasVersion = packumentHasVersion(
        packument,
        SemanticVersion.parse("2.0.0")
      );

      expect(hasVersion).toBeFalsy();
    });
  });
});
