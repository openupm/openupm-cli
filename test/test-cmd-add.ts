import "should";
import { add, AddOptions } from "../src/cmd-add";
import {
  exampleRegistryUrl,
  registerMissingPackage,
  registerRemotePkg,
  registerRemoteUpstreamPkg,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import { createWorkDir, getWorkDir, removeWorkDir } from "./mock-work-dir";
import { attachMockConsole, MockConsole } from "./mock-console";
import {
  shouldHaveDependency,
  shouldHaveManifest,
} from "./manifest-assertions";
import { buildPackageInfo } from "./data-pkg-info";
import { buildPackageManifest } from "./data-pkg-manifest";
import { DomainName } from "../src/types/domain-name";
import { PackageUrl } from "../src/types/package-url";
import { semanticVersion } from "../src/types/semantic-version";
import { packageReference } from "../src/types/package-reference";

describe("cmd-add.ts", function () {
  const packageMissing = "pkg-not-exist" as DomainName;
  const packageA = "com.base.package-a" as DomainName;
  const packageB = "com.base.package-b" as DomainName;
  const packageC = "com.base.package-c" as DomainName;
  const packageD = "com.base.package-d" as DomainName;
  const packageUp = "com.upstream.package-up" as DomainName;
  const packageLowerEditor =
    "com.base.package-with-lower-editor-version" as DomainName;
  const packageHigherEditor =
    "com.base.package-with-higher-editor-version" as DomainName;
  const packageWrongEditor =
    "com.base.package-with-wrong-editor-version" as DomainName;

  const options: AddOptions = {
    _global: {
      registry: exampleRegistryUrl,
      upstream: false,
      chdir: getWorkDir("test-openupm-cli"),
    },
  };
  const upstreamOptions: AddOptions = {
    _global: {
      registry: exampleRegistryUrl,
      upstream: true,
      chdir: getWorkDir("test-openupm-cli"),
    },
  };
  const testableOptions: AddOptions = {
    _global: {
      registry: exampleRegistryUrl,
      upstream: false,
      chdir: getWorkDir("test-openupm-cli"),
    },
    test: true,
  };
  const forceOptions: AddOptions = {
    _global: {
      registry: exampleRegistryUrl,
      upstream: false,
      chdir: getWorkDir("test-openupm-cli"),
    },
    force: true,
  };
  describe("add", function () {
    let mockConsole: MockConsole = null!;

    const remotePkgInfoA = buildPackageInfo(packageA, (pkg) =>
      pkg.addVersion("0.1.0").addVersion("1.0.0")
    );
    const remotePkgInfoB = buildPackageInfo(packageB, (pkg) =>
      pkg.addVersion("1.0.0")
    );
    const remotePkgInfoC = buildPackageInfo(packageC, (pkg) =>
      pkg.addVersion("1.0.0", (version) =>
        version
          .addDependency(packageD, "1.0.0")
          .addDependency("com.unity.modules.x", "1.0.0")
      )
    );
    const remotePkgInfoD = buildPackageInfo(packageD, (pkg) =>
      pkg.addVersion("1.0.0", (version) => {
        return version.addDependency(packageUp, "1.0.0");
      })
    );
    const remotePkgInfoWithLowerEditorVersion = buildPackageInfo(
      packageLowerEditor,
      (pkg) =>
        pkg.addVersion("1.0.0", (version) =>
          version.set("unity", "2019.1").set("unityRelease", "0b1")
        )
    );
    const remotePkgInfoWithHigherEditorVersion = buildPackageInfo(
      packageHigherEditor,
      (pkg) =>
        pkg.addVersion("1.0.0", (version) => version.set("unity", "2020.2"))
    );
    const remotePkgInfoWithWrongEditorVersion = buildPackageInfo(
      packageWrongEditor,
      (pkg) =>
        pkg.addVersion("1.0.0", (version) => version.set("unity", "2020"))
    );
    const remotePkgInfoUp = buildPackageInfo(packageUp, (pkg) =>
      pkg.addVersion("1.0.0")
    );

    const defaultManifest = buildPackageManifest();
    const expectedManifestA = buildPackageManifest((manifest) =>
      manifest.addDependency(packageA, "1.0.0", true, false)
    );
    const expectedManifestAB = buildPackageManifest((manifest) =>
      manifest
        .addDependency(packageA, "1.0.0", true, false)
        .addDependency(packageB, "1.0.0", true, false)
    );
    const expectedManifestC = buildPackageManifest((manifest) =>
      manifest.addDependency(packageC, "1.0.0", true, false).addScope(packageD)
    );
    const expectedManifestUpstream = buildPackageManifest((manifest) =>
      manifest.addDependency(packageUp, "1.0.0", false, false)
    );
    const expectedManifestTestable = buildPackageManifest((manifest) =>
      manifest.addDependency(packageA, "1.0.0", true, true)
    );

    beforeEach(function () {
      removeWorkDir("test-openupm-cli");
      createWorkDir("test-openupm-cli", {
        manifest: true,
        editorVersion: "2019.2.13f1",
      });

      startMockRegistry();
      registerRemotePkg(remotePkgInfoA);
      registerRemotePkg(remotePkgInfoB);
      registerRemotePkg(remotePkgInfoC);
      registerRemotePkg(remotePkgInfoD);
      registerRemotePkg(remotePkgInfoWithLowerEditorVersion);
      registerRemotePkg(remotePkgInfoWithHigherEditorVersion);
      registerRemotePkg(remotePkgInfoWithWrongEditorVersion);
      registerRemoteUpstreamPkg(remotePkgInfoUp);
      registerMissingPackage(packageMissing);

      mockConsole = attachMockConsole();
    });
    afterEach(function () {
      removeWorkDir("test-openupm-cli");
      stopMockRegistry();
      mockConsole.detach();
    });

    it("add pkg", async function () {
      const retCode = await add(packageA, options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestA);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@1.0.0", async function () {
      const retCode = await add(
        packageReference(packageA, semanticVersion("1.0.0")),
        options
      );
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestA);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@latest", async function () {
      const retCode = await add(packageReference(packageA, "latest"), options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestA);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@0.1.0 then pkg@1.0.0", async function () {
      const retCode1 = await add(
        packageReference(packageA, semanticVersion("0.1.0")),
        options
      );
      retCode1.should.equal(0);
      const retCode2 = await add(
        packageReference(packageA, semanticVersion("1.0.0")),
        options
      );
      retCode2.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestA);
      mockConsole.hasLineIncluding("out", "modified ").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add exited pkg version", async function () {
      const retCode1 = await add(
        packageReference(packageA, semanticVersion("1.0.0")),
        options
      );
      retCode1.should.equal(0);
      const retCode2 = await add(
        packageReference(packageA, semanticVersion("1.0.0")),
        options
      );
      retCode2.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestA);
      mockConsole.hasLineIncluding("out", "existed ").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@not-exist-version", async function () {
      const retCode = await add(
        packageReference(packageA, semanticVersion("2.0.0")),
        options
      );
      retCode.should.equal(1);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(defaultManifest);
      mockConsole
        .hasLineIncluding("out", "version 2.0.0 is not a valid choice")
        .should.be.ok();
      mockConsole.hasLineIncluding("out", "1.0.0").should.be.ok();
    });
    it("add pkg@http", async function () {
      const gitUrl = "https://github.com/yo/com.base.package-a" as PackageUrl;
      const retCode = await add(packageReference(packageA, gitUrl), options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      shouldHaveDependency(manifest, packageA, gitUrl);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@git", async function () {
      const gitUrl = "git@github.com:yo/com.base.package-a" as PackageUrl;
      const retCode = await add(packageReference(packageA, gitUrl), options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      shouldHaveDependency(manifest, packageA, gitUrl);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@file", async function () {
      const fileUrl = "file../yo/com.base.package-a" as PackageUrl;
      const retCode = await add(packageReference(packageA, fileUrl), options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      shouldHaveDependency(manifest, packageA, fileUrl);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg-not-exist", async function () {
      const retCode = await add(packageMissing, options);
      retCode.should.equal(1);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(defaultManifest);
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("add more than one pkgs", async function () {
      const retCode = await add([packageA, packageB], options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestAB);
      mockConsole
        .hasLineIncluding("out", "added com.base.package-a")
        .should.be.ok();
      mockConsole
        .hasLineIncluding("out", "added com.base.package-b")
        .should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg from upstream", async function () {
      const retCode = await add(packageUp, upstreamOptions);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestUpstream);
      mockConsole
        .hasLineIncluding("out", "added com.upstream.package-up")
        .should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg-not-exist from upstream", async function () {
      const retCode = await add(packageMissing, upstreamOptions);
      retCode.should.equal(1);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(defaultManifest);
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("add pkg with nested dependencies", async function () {
      const retCode = await add(
        packageReference(packageC, "latest"),
        upstreamOptions
      );
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestC);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg with tests", async function () {
      const retCode = await add(packageA, testableOptions);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestTestable);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg with lower editor version", async function () {
      const retCode = await add(packageLowerEditor, testableOptions);
      retCode.should.equal(0);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg with higher editor version", async function () {
      const retCode = await add(packageHigherEditor, testableOptions);
      retCode.should.equal(1);
      mockConsole
        .hasLineIncluding("out", "requires 2020.2 but found 2019.2.13f1")
        .should.be.ok();
    });
    it("force add pkg with higher editor version", async function () {
      const retCode = await add(packageHigherEditor, forceOptions);
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "requires 2020.2 but found 2019.2.13f1")
        .should.be.ok();
    });
    it("add pkg with wrong editor version", async function () {
      const retCode = await add(packageWrongEditor, testableOptions);
      retCode.should.equal(1);
      mockConsole.hasLineIncluding("out", "2020 is not valid").should.be.ok();
    });
    it("force add pkg with wrong editor version", async function () {
      const retCode = await add(packageWrongEditor, forceOptions);
      retCode.should.equal(0);
      mockConsole.hasLineIncluding("out", "2020 is not valid").should.be.ok();
    });
  });
});
