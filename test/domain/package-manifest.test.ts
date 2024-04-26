import {
  dependenciesOf,
  tryGetTargetEditorVersionFor,
} from "../../src/domain/package-manifest";
import { makeEditorVersion } from "../../src/domain/editor-version";
import { InvalidTargetEditorError } from "../../src/domain/packument";

describe("package manifest", () => {
  describe("get dependency list", () => {
    it("should get all dependencies", () => {
      const packageManifest = {
        dependencies: {
          "com.some.package": "1.0.0",
          "com.other.package": "2.0.0",
        },
      };

      const dependencies = dependenciesOf(packageManifest);

      expect(dependencies).toEqual([
        ["com.some.package", "1.0.0"],
        ["com.other.package", "2.0.0"],
      ]);
    });

    it("should empty list for missing dependencies property", () => {
      const packageManifest = {
        dependencies: undefined,
      };

      const dependencies = dependenciesOf(packageManifest);

      expect(dependencies).toEqual([]);
    });
  });

  describe("determine editor-version", () => {
    it("should get version without release", () => {
      const expected = makeEditorVersion(2020, 3);
      const packageManifest = {
        unity: "2020.3",
      } as const;

      const result = tryGetTargetEditorVersionFor(packageManifest);

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should get version with release", () => {
      const expected = makeEditorVersion(2020, 3, 1);
      const packageManifest = {
        unity: "2020.3",
        unityRelease: "1",
      } as const;

      const result = tryGetTargetEditorVersionFor(packageManifest);

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });

    it("should be null for missing major.minor", () => {
      const packageManifest = {};

      const result = tryGetTargetEditorVersionFor(packageManifest);

      expect(result).toBeOk((actual) => expect(actual).toBeNull());
    });

    it("should fail for bad version", () => {
      const packageManifest = {
        unity: "bad version",
      } as const;

      const result = tryGetTargetEditorVersionFor(
        // We pass a package with a bad value on purpose here
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        packageManifest
      );

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(InvalidTargetEditorError)
      );
    });
  });
});
