import { remove } from "../src/cmd-remove";
import { exampleRegistryUrl } from "./mock-registry";
import { attachMockConsole, MockConsole } from "./mock-console";
import { buildProjectManifest } from "./data-project-manifest";
import { domainName } from "../src/types/domain-name";
import { semanticVersion } from "../src/types/semantic-version";
import { packageReference } from "../src/types/package-reference";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";

const packageA = domainName("com.example.package-a");
const packageB = domainName("com.example.package-b");
const missingPackage = domainName("pkg-not-exist");

describe("cmd-remove.ts", function () {
  describe("remove", function () {
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

    it("remove pkg", async function () {
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
    it("remove pkg@1.0.0", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };
      const removeResult = await remove(
        packageReference(packageA, semanticVersion("1.0.0")),
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
    it("remove pkg-not-exist", async function () {
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
    it("remove more than one pkgs", async function () {
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
