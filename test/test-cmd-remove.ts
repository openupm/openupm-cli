import "should";
import { remove } from "../src/cmd-remove";
import { exampleRegistryUrl } from "./mock-registry";
import { attachMockConsole, MockConsole } from "./mock-console";
import {
  shouldHaveRegistryWithScopes,
  shouldNotHaveDependency,
} from "./project-manifest-assertions";
import { buildProjectManifest } from "./data-project-manifest";
import { domainName } from "../src/types/domain-name";
import { semanticVersion } from "../src/types/semantic-version";
import { packageReference } from "../src/types/package-reference";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";
import { after } from "mocha";

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

    before(function () {
      mockProject = setupUnityProject({ manifest: defaultManifest });
    });

    beforeEach(function () {
      mockConsole = attachMockConsole();
    });

    afterEach(function () {
      mockProject.reset();
      mockConsole.detach();
    });

    after(function () {
      mockProject.restore();
    });

    it("remove pkg", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };
      const retCode = await remove(packageA, options);
      retCode.should.equal(0);
      mockProject.tryAssertManifest((manifest) => {
        shouldNotHaveDependency(manifest, packageA);
        shouldHaveRegistryWithScopes(manifest, [packageB]);
      });
      mockConsole.hasLineIncluding("out", "removed ").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("remove pkg@1.0.0", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };
      const retCode = await remove(
        packageReference(packageA, semanticVersion("1.0.0")),
        options
      );
      retCode.should.equal(1);
      mockProject.tryAssertManifest((manifest) => {
        manifest.should.deepEqual(defaultManifest);
      });
      mockConsole.hasLineIncluding("out", "please replace").should.be.ok();
    });
    it("remove pkg-not-exist", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };
      const retCode = await remove(missingPackage, options);
      retCode.should.equal(1);
      mockProject.tryAssertManifest((manifest) => {
        manifest.should.deepEqual(defaultManifest);
      });
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("remove more than one pkgs", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };
      const retCode = await remove([packageA, packageB], options);
      retCode.should.equal(0);

      mockProject.tryAssertManifest((manifest) => {
        shouldNotHaveDependency(manifest, packageA);
        shouldNotHaveDependency(manifest, packageB);
      });
      mockConsole
        .hasLineIncluding("out", "removed com.example.package-a")
        .should.be.ok();
      mockConsole
        .hasLineIncluding("out", "removed com.example.package-b")
        .should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
  });
});
