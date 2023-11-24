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
import { DomainName } from "../src/types/domain-name";
import { atVersion } from "../src/utils/pkg-name";
import { SemanticVersion } from "../src/types/semantic-version";

const packageA = "com.example.package-a" as DomainName;
const packageB = "com.example.package-b" as DomainName;
const missingPackage = "pkg-not-exist" as DomainName;

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
        atVersion(packageA, "1.0.0" as SemanticVersion),
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
