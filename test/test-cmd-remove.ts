import "should";
import { remove } from "../src/cmd-remove";
import {
  exampleRegistryReverseDomain,
  exampleRegistryUrl,
} from "./mock-registry";
import { createWorkDir, getWorkDir, removeWorkDir } from "./mock-work-dir";
import { attachMockConsole, MockConsole } from "./mock-console";
import {
  shouldHaveManifest,
  shouldHaveRegistryWithScopes,
  shouldNotHaveDependency,
} from "./manifest-assertions";
import { buildPackageManifest } from "./data-pkg-manifest";
import { domainName } from "../src/types/domain-name";
import { semanticVersion } from "../src/types/semantic-version";
import { packageReference } from "../src/types/package-reference";

const packageA = domainName("com.example.package-a");
const packageB = domainName("com.example.package-b");
const missingPackage = domainName("pkg-not-exist");

describe("cmd-remove.ts", function () {
  describe("remove", function () {
    let mockConsole: MockConsole = null!;

    const defaultManifest = buildPackageManifest((manifest) =>
      manifest
        .addDependency(packageA, "1.0.0", true, false)
        .addDependency(packageB, "1.0.0", true, false)
    );

    beforeEach(function () {
      removeWorkDir("test-openupm-cli");
      createWorkDir("test-openupm-cli", {
        manifest: defaultManifest,
      });
      mockConsole = attachMockConsole();
    });
    afterEach(function () {
      removeWorkDir("test-openupm-cli");
      mockConsole.detach();
    });
    it("remove pkg", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
          chdir: getWorkDir("test-openupm-cli"),
        },
      };
      const retCode = await remove(packageA, options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      shouldNotHaveDependency(manifest, packageA);
      shouldHaveRegistryWithScopes(manifest, [
        exampleRegistryReverseDomain,
        packageB,
      ]);
      mockConsole.hasLineIncluding("out", "removed ").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("remove pkg@1.0.0", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
          chdir: getWorkDir("test-openupm-cli"),
        },
      };
      const retCode = await remove(
        packageReference(packageA, semanticVersion("1.0.0")),
        options
      );
      retCode.should.equal(1);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(defaultManifest);
      mockConsole.hasLineIncluding("out", "please replace").should.be.ok();
    });
    it("remove pkg-not-exist", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
          chdir: getWorkDir("test-openupm-cli"),
        },
      };
      const retCode = await remove(missingPackage, options);
      retCode.should.equal(1);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(defaultManifest);
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("remove more than one pkgs", async function () {
      const options = {
        _global: {
          registry: exampleRegistryUrl,
          chdir: getWorkDir("test-openupm-cli"),
        },
      };
      const retCode = await remove([packageA, packageB], options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      shouldNotHaveDependency(manifest, packageA);
      shouldNotHaveDependency(manifest, packageB);
      shouldHaveRegistryWithScopes(manifest, [exampleRegistryReverseDomain]);
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
