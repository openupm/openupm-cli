import { dependenciesOf } from "../../src/domain/package-manifest";

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
});
