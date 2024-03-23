import { remove } from "../src/cmd-remove";
import { exampleRegistryUrl } from "./mock-registry";
import { attachMockConsole, MockConsole } from "./mock-console";
import { buildProjectManifest } from "./data-project-manifest";
import { makeDomainName } from "../src/domain/domain-name";
import { makeSemanticVersion } from "../src/domain/semantic-version";
import { makePackageReference } from "../src/domain/package-reference";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";

const packageA = makeDomainName("com.example.package-a");
const packageB = makeDomainName("com.example.package-b");
const missingPackage = makeDomainName("pkg-not-exist");

describe("cmd-remove.ts", () => {
  describe("remove", () => {
    const defaultManifest = buildProjectManifest((manifest) =>
      manifest
        .addDependency(packageA, "1.0.0", true, false)
        .addDependency(packageB, "1.0.0", true, false)
    );

    let mockConsole: MockConsole = null!;
    let mockProject: MockUnityProject = null!;

    beforeAll(async function () {
      mockProject = await setupUnityProject({ manifest: defaultManifest });
    });

    beforeEach(function () {
      mockConsole = attachMockConsole();
    });

    afterEach(async function () {
      await mockProject.reset();
      mockConsole.detach();
    });

    afterAll(async function () {
      await mockProject.restore();
    });

    it("should remove packument without version", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };
      const removeResult = await remove(packageA, options);
      expect(removeResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) => {
        expect(manifest).not.toHaveDependency(packageA);
        expect(manifest).toHaveScope(packageB);
      });
      expect(mockConsole).toHaveLineIncluding("out", "removed ");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should remove packument with semantic version", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };
      const removeResult = await remove(
        makePackageReference(packageA, makeSemanticVersion("1.0.0")),
        options
      );
      expect(removeResult).toBeError();
      await mockProject.tryAssertManifest((manifest) => {
        expect(manifest).toEqual(defaultManifest);
      });
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "do not specify a version"
      );
    });
    it("should fail for uninstalled packument", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };
      const removeResult = await remove(missingPackage, options);
      expect(removeResult).toBeError();
      await mockProject.tryAssertManifest((manifest) => {
        expect(manifest).toEqual(defaultManifest);
      });
      expect(mockConsole).toHaveLineIncluding("out", "package not found");
    });
    it("should remove multiple packuments", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };
      const removeResult = await remove([packageA, packageB], options);
      expect(removeResult).toBeOk();

      await mockProject.tryAssertManifest((manifest) => {
        expect(manifest).not.toHaveDependency(packageA);
        expect(manifest).not.toHaveDependency(packageB);
      });
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "removed com.example.package-a"
      );
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "removed com.example.package-b"
      );
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should delete scoped-registry after removing all packages", async () => {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };
      const removeResult = await remove([packageA, packageB], options);
      expect(removeResult).toBeOk();

      await mockProject.tryAssertManifest((manifest) => {
        expect(manifest.scopedRegistries).toHaveLength(0);
      });
    });
  });
});
