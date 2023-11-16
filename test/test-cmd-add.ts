import "assert";
import "should";

import { add, AddOptions } from "../src/cmd-add";

import { loadManifest } from "../src/utils/manifest";
import { PkgInfo, PkgManifest, PkgName, PkgVersion } from "../src/types/global";
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
    const remotePkgInfoA: PkgInfo = {
      name: "com.base.package-a",
      versions: {
        "0.1.0": {
          name: "com.base.package-a",
          version: "0.1.0",
          dependencies: {},
        },
        "1.0.0": {
          name: "com.base.package-a",
          version: "1.0.0",
          dependencies: {},
        },
      },
      "dist-tags": {
        latest: "1.0.0",
      },
      time: {},
    };
    const remotePkgInfoB: PkgInfo = {
      name: "com.base.package-b",
      versions: {
        "1.0.0": {
          name: "com.base.package-b",
          version: "1.0.0",
          dependencies: {},
        },
      },
      "dist-tags": {
        latest: "1.0.0",
      },
      time: {},
    };
    const remotePkgInfoC: PkgInfo = {
      name: "com.base.package-c",
      versions: {
        "1.0.0": {
          name: "com.base.package-c",
          version: "1.0.0",
          dependencies: {
            "com.base.package-d": "1.0.0",
            "com.unity.modules.x": "1.0.0",
          },
        },
      },
      "dist-tags": {
        latest: "1.0.0",
      },
      time: {},
    };
    const remotePkgInfoD: PkgInfo = {
      name: "com.base.package-d",
      versions: {
        "1.0.0": {
          name: "com.base.package-d",
          version: "1.0.0",
          dependencies: {
            "com.upstream.package-up": "1.0.0",
          },
        },
      },
      "dist-tags": {
        latest: "1.0.0",
      },
      time: {},
    };
    const remotePkgInfoWithLowerEditorVersion: PkgInfo = {
      name: "com.base.package-with-lower-editor-version",
      versions: {
        "1.0.0": {
          name: "com.base.package-with-lower-editor-version",
          version: "1.0.0",
          unity: "2019.1",
          unityRelease: "0b1",
        },
      },
      "dist-tags": {
        latest: "1.0.0",
      },
      time: {},
    };
    const remotePkgInfoWithHigherEditorVersion: PkgInfo = {
      name: "com.base.package-with-higher-editor-version",
      versions: {
        "1.0.0": {
          name: "com.base.package-with-higher-editor-version",
          version: "1.0.0",
          unity: "2020.2",
        },
      },
      "dist-tags": {
        latest: "1.0.0",
      },
      time: {},
    };
    const remotePkgInfoWithWrongEditorVersion: PkgInfo = {
      name: "com.base.package-with-wrong-editor-version",
      versions: {
        "1.0.0": {
          name: "com.base.package-with-wrong-editor-version",
          version: "1.0.0",
          unity: "2020",
        },
      },
      "dist-tags": {
        latest: "1.0.0",
      },
      time: {},
    };
    const remotePkgInfoUp: PkgInfo = {
      name: "com.upstream.package-up",
      versions: {
        "1.0.0": {
          name: "com.upstream.package-up",
          version: "1.0.0",
          dependencies: {},
        },
      },
      "dist-tags": {
        latest: "1.0.0",
      },
      time: {},
    };
    const defaultManifest: PkgManifest = {
      dependencies: {},
    };
    const expectedManifestA: PkgManifest = {
      dependencies: {
        "com.base.package-a": "1.0.0",
      },
      scopedRegistries: [
        {
          name: "example.com",
          scopes: ["com.base.package-a", "com.example"],
          url: exampleRegistryUrl,
        },
      ],
    };
    const expectedManifestAB: PkgManifest = {
      dependencies: {
        "com.base.package-a": "1.0.0",
        "com.base.package-b": "1.0.0",
      },
      scopedRegistries: [
        {
          name: "example.com",
          scopes: ["com.base.package-a", "com.base.package-b", "com.example"],
          url: exampleRegistryUrl,
        },
      ],
    };
    const expectedManifestC: PkgManifest = {
      dependencies: {
        "com.base.package-c": "1.0.0",
      },
      scopedRegistries: [
        {
          name: "example.com",
          scopes: ["com.base.package-c", "com.base.package-d", "com.example"],
          url: exampleRegistryUrl,
        },
      ],
    };
    const expectedManifestUpstream: PkgManifest = {
      dependencies: {
        "com.upstream.package-up": "1.0.0",
      },
    };
    const expectedManifestTestable: PkgManifest = {
      dependencies: {
        "com.base.package-a": "1.0.0",
      },
      scopedRegistries: [
        {
          name: "example.com",
          scopes: ["com.base.package-a", "com.example"],
          url: exampleRegistryUrl,
        },
      ],
      testables: ["com.base.package-a"],
    };
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

    function shouldHaveManifest(): PkgManifest {
      const manifest = loadManifest();
      (manifest !== null).should.be.ok();
      return manifest!;
    }

    function shouldHaveManifestMatching(expected: PkgManifest) {
      const manifest = shouldHaveManifest();
      manifest!.should.be.deepEqual(expected);
    }

    function shouldHaveManifestWithDependency(
      name: PkgName,
      version: PkgVersion
    ) {
      const manifest = shouldHaveManifest();
      const dependency = manifest.dependencies[name];
      (dependency !== undefined).should.be.ok();
      dependency.should.be.equal(version);
    }

    it("add pkg", async function () {
      const retCode = await add("com.base.package-a", options);
      retCode.should.equal(0);
      shouldHaveManifestMatching(expectedManifestA);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@1.0.0", async function () {
      const retCode = await add("com.base.package-a@1.0.0", options);
      retCode.should.equal(0);
      shouldHaveManifestMatching(expectedManifestA);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@latest", async function () {
      const retCode = await add("com.base.package-a@latest", options);
      retCode.should.equal(0);
      shouldHaveManifestMatching(expectedManifestA);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@0.1.0 then pkg@1.0.0", async function () {
      const retCode1 = await add("com.base.package-a@0.1.0", options);
      retCode1.should.equal(0);
      const retCode2 = await add("com.base.package-a@1.0.0", options);
      retCode2.should.equal(0);
      shouldHaveManifestMatching(expectedManifestA);
      mockConsole.hasLineIncluding("out", "modified ").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add exited pkg version", async function () {
      const retCode1 = await add("com.base.package-a@1.0.0", options);
      retCode1.should.equal(0);
      const retCode2 = await add("com.base.package-a@1.0.0", options);
      retCode2.should.equal(0);
      shouldHaveManifestMatching(expectedManifestA);
      mockConsole.hasLineIncluding("out", "existed ").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@not-exist-version", async function () {
      const retCode = await add("com.base.package-a@2.0.0", options);
      retCode.should.equal(1);
      shouldHaveManifestMatching(defaultManifest);
      mockConsole
        .hasLineIncluding("out", "version 2.0.0 is not a valid choice")
        .should.be.ok();
      mockConsole.hasLineIncluding("out", "1.0.0").should.be.ok();
    });
    it("add pkg@http", async function () {
      const gitUrl = "https://github.com/yo/com.base.package-a";
      const retCode = await add("com.base.package-a@" + gitUrl, options);
      retCode.should.equal(0);
      shouldHaveManifestWithDependency("com.base.package-a", gitUrl);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@git", async function () {
      const gitUrl = "git@github.com:yo/com.base.package-a";
      const retCode = await add("com.base.package-a@" + gitUrl, options);
      retCode.should.equal(0);
      shouldHaveManifestWithDependency("com.base.package-a", gitUrl);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@file", async function () {
      const fileUrl = "file../yo/com.base.package-a";
      const retCode = await add("com.base.package-a@" + fileUrl, options);
      retCode.should.equal(0);
      shouldHaveManifestWithDependency("com.base.package-a", fileUrl);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg-not-exist", async function () {
      const retCode = await add("pkg-not-exist", options);
      retCode.should.equal(1);
      shouldHaveManifestMatching(defaultManifest);
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("add more than one pkgs", async function () {
      const retCode = await add(
        ["com.base.package-a", "com.base.package-b"],
        options
      );
      retCode.should.equal(0);
      shouldHaveManifestMatching(expectedManifestAB);
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
      shouldHaveManifestMatching(expectedManifestUpstream);
      mockConsole
        .hasLineIncluding("out", "added com.upstream.package-up")
        .should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg-not-exist from upstream", async function () {
      const retCode = await add("pkg-not-exist", upstreamOptions);
      retCode.should.equal(1);
      shouldHaveManifestMatching(defaultManifest);
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("add pkg with nested dependencies", async function () {
      const retCode = await add("com.base.package-c@latest", upstreamOptions);
      retCode.should.equal(0);
      shouldHaveManifestMatching(expectedManifestC);
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg with tests", async function () {
      const retCode = await add("com.base.package-a", testableOptions);
      retCode.should.equal(0);
      shouldHaveManifestMatching(expectedManifestTestable);
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
