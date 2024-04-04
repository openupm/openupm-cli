import { remove } from "../src/cli/cmd-remove";
import { exampleRegistryUrl } from "./mock-registry";
import { buildProjectManifest } from "./data-project-manifest";
import { makeDomainName } from "../src/domain/domain-name";
import { makeSemanticVersion } from "../src/domain/semantic-version";
import { makePackageReference } from "../src/domain/package-reference";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";
import { spyOnLog } from "./log.mock";

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

    let mockProject: MockUnityProject = null!;

    beforeAll(async function () {
      mockProject = await setupUnityProject({ manifest: defaultManifest });
    });

    afterEach(async function () {
      await mockProject.reset();
    });

    afterAll(async function () {
      await mockProject.restore();
    });

    it("should remove packument without version", async function () {
      const noticeSpy = spyOnLog("notice");
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
      expect(noticeSpy).toHaveLogLike("manifest", "removed ");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });
    it("should remove packument with semantic version", async function () {
      const warnSpy = spyOnLog("warn");
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
      expect(warnSpy).toHaveLogLike("", "do not specify a version");
    });
    it("should fail for uninstalled packument", async function () {
      const errorSpy = spyOnLog("error");
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
      expect(errorSpy).toHaveLogLike("404", "package not found");
    });
    it("should remove multiple packuments", async function () {
      const noticeSpy = spyOnLog("notice");
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
      expect(noticeSpy).toHaveLogLike(
        "manifest",
        "removed com.example.package-a"
      );
      expect(noticeSpy).toHaveLogLike(
        "manifest",
        "removed com.example.package-b"
      );
      expect(noticeSpy).toHaveLogLike("", "open Unity");
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
