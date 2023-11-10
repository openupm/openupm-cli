import "assert";
import nock from "nock";
import "should";

import { add, AddOptions } from "../src/cmd-add";

import {
  createWorkDir,
  getInspects,
  getOutputs,
  getWorkDir,
  nockDown,
  nockUp,
  removeWorkDir,
} from "./utils";
import testConsole from "test-console";
import assert from "assert";
import { loadManifest } from "../src/utils/manifest";
import { PkgInfo, PkgManifest } from "../src/types/global";

describe("cmd-add.ts", function () {
  const options: AddOptions = {
    _global: {
      registry: "http://example.com",
      upstream: false,
      chdir: getWorkDir("test-openupm-cli"),
    },
  };
  const upstreamOptions: AddOptions = {
    _global: {
      registry: "http://example.com",
      upstream: true,
      chdir: getWorkDir("test-openupm-cli"),
    },
  };
  const testableOptions: AddOptions = {
    _global: {
      registry: "http://example.com",
      upstream: false,
      chdir: getWorkDir("test-openupm-cli"),
    },
    test: true,
  };
  const forceOptions: AddOptions = {
    _global: {
      registry: "http://example.com",
      upstream: false,
      chdir: getWorkDir("test-openupm-cli"),
    },
    force: true,
  };
  describe("add", function () {
    let stdoutInspect: testConsole.Inspector = null!;
    let stderrInspect: testConsole.Inspector = null!;
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
          url: "http://example.com",
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
          url: "http://example.com",
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
          url: "http://example.com",
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
          url: "http://example.com",
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
      nockUp();
      nock("http://example.com")
        .persist()
        .get("/com.base.package-a")
        .reply(200, remotePkgInfoA, { "Content-Type": "application/json" });
      nock("http://example.com")
        .persist()
        .get("/com.base.package-b")
        .reply(200, remotePkgInfoB, { "Content-Type": "application/json" });
      nock("http://example.com")
        .persist()
        .get("/com.base.package-c")
        .reply(200, remotePkgInfoC, { "Content-Type": "application/json" });
      nock("http://example.com")
        .persist()
        .get("/com.base.package-d")
        .reply(200, remotePkgInfoD, { "Content-Type": "application/json" });
      nock("http://example.com")
        .persist()
        .get("/com.base.package-with-lower-editor-version")
        .reply(200, remotePkgInfoWithLowerEditorVersion, {
          "Content-Type": "application/json",
        });
      nock("http://example.com")
        .persist()
        .get("/com.base.package-with-higher-editor-version")
        .reply(200, remotePkgInfoWithHigherEditorVersion, {
          "Content-Type": "application/json",
        });
      nock("http://example.com")
        .persist()
        .get("/com.base.package-with-wrong-editor-version")
        .reply(200, remotePkgInfoWithWrongEditorVersion, {
          "Content-Type": "application/json",
        });
      nock("http://example.com").persist().get("/pkg-not-exist").reply(404);
      nock("http://example.com")
        .persist()
        .get("/com.upstream.package-up")
        .reply(404);
      nock("https://packages.unity.com")
        .persist()
        .get("/com.upstream.package-up")
        .reply(200, remotePkgInfoUp, {
          "Content-Type": "application/json",
        });
      nock("https://packages.unity.com")
        .persist()
        .get("/pkg-not-exist")
        .reply(404);
      [stdoutInspect, stderrInspect] = getInspects();
    });
    afterEach(function () {
      removeWorkDir("test-openupm-cli");
      nockDown();
      stdoutInspect.restore();
      stderrInspect.restore();
    });
    it("add pkg", async function () {
      const retCode = await add("com.base.package-a", options);
      retCode.should.equal(0);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.should.be.deepEqual(expectedManifestA);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg@1.0.0", async function () {
      const retCode = await add("com.base.package-a@1.0.0", options);
      retCode.should.equal(0);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.should.be.deepEqual(expectedManifestA);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg@latest", async function () {
      const retCode = await add("com.base.package-a@latest", options);
      retCode.should.equal(0);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.should.be.deepEqual(expectedManifestA);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg@0.1.0 then pkg@1.0.0", async function () {
      const retCode1 = await add("com.base.package-a@0.1.0", options);
      retCode1.should.equal(0);
      const retCode2 = await add("com.base.package-a@1.0.0", options);
      retCode2.should.equal(0);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.should.be.deepEqual(expectedManifestA);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("modified ").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add exited pkg version", async function () {
      const retCode1 = await add("com.base.package-a@1.0.0", options);
      retCode1.should.equal(0);
      const retCode2 = await add("com.base.package-a@1.0.0", options);
      retCode2.should.equal(0);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.should.be.deepEqual(expectedManifestA);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("existed ").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg@not-exist-version", async function () {
      const retCode = await add("com.base.package-a@2.0.0", options);
      retCode.should.equal(1);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.should.be.deepEqual(defaultManifest);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("version 2.0.0 is not a valid choice").should.be.ok();
      stdout.includes("1.0.0").should.be.ok();
    });
    it("add pkg@http", async function () {
      const gitUrl = "https://github.com/yo/com.base.package-a";
      const retCode = await add("com.base.package-a@" + gitUrl, options);
      retCode.should.equal(0);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.dependencies["com.base.package-a"].should.be.equal(gitUrl);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg@git", async function () {
      const gitUrl = "git@github.com:yo/com.base.package-a";
      const retCode = await add("com.base.package-a@" + gitUrl, options);
      retCode.should.equal(0);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.dependencies["com.base.package-a"].should.be.equal(gitUrl);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg@file", async function () {
      const fileUrl = "file../yo/com.base.package-a";
      const retCode = await add("com.base.package-a@" + fileUrl, options);
      retCode.should.equal(0);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.dependencies["com.base.package-a"].should.be.equal(fileUrl);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg-not-exist", async function () {
      const retCode = await add("pkg-not-exist", options);
      retCode.should.equal(1);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.should.deepEqual(defaultManifest);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("package not found").should.be.ok();
    });
    it("add more than one pkgs", async function () {
      const retCode = await add(
        ["com.base.package-a", "com.base.package-b"],
        options
      );
      retCode.should.equal(0);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.should.be.deepEqual(expectedManifestAB);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added com.base.package-a").should.be.ok();
      stdout.includes("added com.base.package-b").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg from upstream", async function () {
      const retCode = await add("com.upstream.package-up", upstreamOptions);
      retCode.should.equal(0);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.should.be.deepEqual(expectedManifestUpstream);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added com.upstream.package-up").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg-not-exist from upstream", async function () {
      const retCode = await add("pkg-not-exist", upstreamOptions);
      retCode.should.equal(1);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.should.deepEqual(defaultManifest);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("package not found").should.be.ok();
    });
    it("add pkg with nested dependencies", async function () {
      const retCode = await add("com.base.package-c@latest", upstreamOptions);
      retCode.should.equal(0);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.should.be.deepEqual(expectedManifestC);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg with tests", async function () {
      const retCode = await add("com.base.package-a", testableOptions);
      retCode.should.equal(0);
      const manifest = loadManifest();
      assert(manifest !== null);
      manifest.should.be.deepEqual(expectedManifestTestable);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg with lower editor version", async function () {
      const retCode = await add(
        "com.base.package-with-lower-editor-version",
        testableOptions
      );
      retCode.should.equal(0);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("added").should.be.ok();
      stdout.includes("open Unity").should.be.ok();
    });
    it("add pkg with higher editor version", async function () {
      const retCode = await add(
        "com.base.package-with-higher-editor-version",
        testableOptions
      );
      retCode.should.equal(1);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("requires 2020.2 but found 2019.2.13f1").should.be.ok();
    });
    it("force add pkg with higher editor version", async function () {
      const retCode = await add(
        "com.base.package-with-higher-editor-version",
        forceOptions
      );
      retCode.should.equal(0);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("requires 2020.2 but found 2019.2.13f1").should.be.ok();
    });
    it("add pkg with wrong editor version", async function () {
      const retCode = await add(
        "com.base.package-with-wrong-editor-version",
        testableOptions
      );
      retCode.should.equal(1);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("2020 is not valid").should.be.ok();
      console.log(stdout);
    });
    it("force add pkg with wrong editor version", async function () {
      const retCode = await add(
        "com.base.package-with-wrong-editor-version",
        forceOptions
      );
      retCode.should.equal(0);
      const [stdout] = getOutputs(stdoutInspect, stderrInspect);
      stdout.includes("2020 is not valid").should.be.ok();
      console.log(stdout);
    });
  });
});
