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

describe("cmd-add.ts", function () {
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
    const remotePkgInfoA = buildPackageInfo("com.base.package-a", (pkg) =>
      pkg.addVersion("0.1.0").addVersion("1.0.0")
    );
    const remotePkgInfoB = buildPackageInfo("com.base.package-b", (pkg) =>
      pkg.addVersion("1.0.0")
    );
    const remotePkgInfoC = buildPackageInfo("com.base.package-c", (pkg) =>
      pkg.addVersion("1.0.0", (version) =>
        version
          .addDependency("com.base.package-d", "1.0.0")
          .addDependency("com.unity.modules.x", "1.0.0")
      )
    );
    const remotePkgInfoD = buildPackageInfo("com.base.package-d", (pkg) =>
      pkg.addVersion("1.0.0", (version) =>
        version.addDependency("com.upstream.package-up", "1.0.0")
      )
    );
    const remotePkgInfoWithLowerEditorVersion = buildPackageInfo(
      "com.base.package-with-lower-editor-version",
      (pkg) =>
        pkg.addVersion("1.0.0", (version) =>
          version.set("unity", "2019.1").set("unityRelease", "0b1")
        )
    );
    const remotePkgInfoWithHigherEditorVersion = buildPackageInfo(
      "com.base.package-with-higher-editor-version",
      (pkg) =>
        pkg.addVersion("1.0.0", (version) => version.set("unity", "2020.2"))
    );
    const remotePkgInfoWithWrongEditorVersion = buildPackageInfo(
      "com.base.package-with-wrong-editor-version",
      (pkg) =>
        pkg.addVersion("1.0.0", (version) => version.set("unity", "2020"))
    );
    const remotePkgInfoUp = buildPackageInfo("com.upstream.package-up", (pkg) =>
      pkg.addVersion("1.0.0")
    );

    const defaultManifest = buildPackageManifest();
    const expectedManifestA = buildPackageManifest((manifest) =>
      manifest.addDependency("com.base.package-a", "1.0.0", true, false)
    );
    const expectedManifestAB = buildPackageManifest((manifest) =>
      manifest
        .addDependency("com.base.package-a", "1.0.0", true, false)
        .addDependency("com.base.package-b", "1.0.0", true, false)
    );
    const expectedManifestC = buildPackageManifest((manifest) =>
      manifest
        .addDependency("com.base.package-c", "1.0.0", true, false)
        .addScope("com.base.package-d")
    );
    const expectedManifestUpstream = buildPackageManifest((manifest) =>
      manifest.addDependency("com.upstream.package-up", "1.0.0", false, false)
    );
    const expectedManifestTestable = buildPackageManifest((manifest) =>
      manifest.addDependency("com.base.package-a", "1.0.0", true, true)
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
      registerMissingPackage("pkg-not-exist");

      mockConsole = attachMockConsole();
    });
    afterEach(function () {
      removeWorkDir("test-openupm-cli");
      stopMockRegistry();
      mockConsole.detach();
    });

    it("add pkg", async function () {
      const retCode = await add("com.base.package-a", options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestA);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@1.0.0", async function () {
      const retCode = await add("com.base.package-a@1.0.0", options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestA);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@latest", async function () {
      const retCode = await add("com.base.package-a@latest", options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestA);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@0.1.0 then pkg@1.0.0", async function () {
      const retCode1 = await add("com.base.package-a@0.1.0", options);
      retCode1.should.equal(0);
      const retCode2 = await add("com.base.package-a@1.0.0", options);
      retCode2.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestA);
      mockConsole.hasLineIncluding("out", "modified ").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add exited pkg version", async function () {
      const retCode1 = await add("com.base.package-a@1.0.0", options);
      retCode1.should.equal(0);
      const retCode2 = await add("com.base.package-a@1.0.0", options);
      retCode2.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestA);
      mockConsole.hasLineIncluding("out", "existed ").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@not-exist-version", async function () {
      const retCode = await add("com.base.package-a@2.0.0", options);
      retCode.should.equal(1);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(defaultManifest);
      mockConsole
        .hasLineIncluding("out", "version 2.0.0 is not a valid choice")
        .should.be.ok();
      mockConsole.hasLineIncluding("out", "1.0.0").should.be.ok();
    });
    it("add pkg@http", async function () {
      const gitUrl = "https://github.com/yo/com.base.package-a";
      const retCode = await add("com.base.package-a@" + gitUrl, options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      shouldHaveDependency(manifest, "com.base.package-a", gitUrl);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@git", async function () {
      const gitUrl = "git@github.com:yo/com.base.package-a";
      const retCode = await add("com.base.package-a@" + gitUrl, options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      shouldHaveDependency(manifest, "com.base.package-a", gitUrl);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@file", async function () {
      const fileUrl = "file../yo/com.base.package-a";
      const retCode = await add("com.base.package-a@" + fileUrl, options);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      shouldHaveDependency(manifest, "com.base.package-a", fileUrl);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg-not-exist", async function () {
      const retCode = await add("pkg-not-exist", options);
      retCode.should.equal(1);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(defaultManifest);
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("add more than one pkgs", async function () {
      const retCode = await add(
        ["com.base.package-a", "com.base.package-b"],
        options
      );
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
      const retCode = await add("com.upstream.package-up", upstreamOptions);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestUpstream);
      mockConsole
        .hasLineIncluding("out", "added com.upstream.package-up")
        .should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg-not-exist from upstream", async function () {
      const retCode = await add("pkg-not-exist", upstreamOptions);
      retCode.should.equal(1);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(defaultManifest);
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("add pkg with nested dependencies", async function () {
      const retCode = await add("com.base.package-c@latest", upstreamOptions);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestC);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg with tests", async function () {
      const retCode = await add("com.base.package-a", testableOptions);
      retCode.should.equal(0);
      const manifest = shouldHaveManifest();
      manifest.should.deepEqual(expectedManifestTestable);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg with lower editor version", async function () {
      const retCode = await add(
        "com.base.package-with-lower-editor-version",
        testableOptions
      );
      retCode.should.equal(0);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg with higher editor version", async function () {
      const retCode = await add(
        "com.base.package-with-higher-editor-version",
        testableOptions
      );
      retCode.should.equal(1);
      mockConsole
        .hasLineIncluding("out", "requires 2020.2 but found 2019.2.13f1")
        .should.be.ok();
    });
    it("force add pkg with higher editor version", async function () {
      const retCode = await add(
        "com.base.package-with-higher-editor-version",
        forceOptions
      );
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "requires 2020.2 but found 2019.2.13f1")
        .should.be.ok();
    });
    it("add pkg with wrong editor version", async function () {
      const retCode = await add(
        "com.base.package-with-wrong-editor-version",
        testableOptions
      );
      retCode.should.equal(1);
      mockConsole.hasLineIncluding("out", "2020 is not valid").should.be.ok();
    });
    it("force add pkg with wrong editor version", async function () {
      const retCode = await add(
        "com.base.package-with-wrong-editor-version",
        forceOptions
      );
      retCode.should.equal(0);
      mockConsole.hasLineIncluding("out", "2020 is not valid").should.be.ok();
    });
  });
});
