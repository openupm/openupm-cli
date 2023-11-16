import "assert";
import "should";
import { view, ViewOptions } from "../src/cmd-view";
import { PkgInfo } from "../src/types/global";
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

describe("cmd-view.ts", function () {
  const options: ViewOptions = {
    _global: {
      registry: exampleRegistryUrl,
      upstream: false,
      chdir: getWorkDir("test-openupm-cli"),
    },
  };
  const upstreamOptions: ViewOptions = {
    _global: {
      registry: exampleRegistryUrl,
      chdir: getWorkDir("test-openupm-cli"),
    },
  };
  describe("view", function () {
    let mockConsole: MockConsole = null!;

    const remotePkgInfoA: PkgInfo = {
      name: "com.example.package-a",
      versions: {
        "1.0.0": {
          name: "com.example.package-a",
          displayName: "Package A",
          author: {
            name: "batman",
          },
          version: "1.0.0",
          unity: "2018.4",
          description: "A demo package",
          keywords: [""],
          category: "Unity",
          dependencies: {
            "com.example.package-a": "^1.0.0",
          },
          gitHead: "5c141ecfac59c389090a07540f44c8ac5d07a729",
          readmeFilename: "README.md",
          _id: "com.example.package-a@1.0.0",
          _nodeVersion: "12.13.1",
          _npmVersion: "6.12.1",
          dist: {
            integrity:
              "sha512-MAh44bur7HGyfbCXH9WKfaUNS67aRMfO0VAbLkr+jwseb1hJue/I1pKsC7PKksuBYh4oqoo9Jov1cBcvjVgjmA==",
            shasum: "516957cac4249f95cafab0290335def7d9703db7",
            tarball:
              "https://cdn.example.com/com.example.package-a/com.example.package-a-1.0.0.tgz",
          },
          contributors: [],
        },
      },
      time: {
        modified: "2019-11-28T18:51:58.123Z",
        created: "2019-11-28T18:51:58.123Z",
        "1.0.0": "2019-11-28T18:51:58.123Z",
      },
      users: {},
      "dist-tags": {
        latest: "1.0.0",
      },
      _rev: "3-418f950115c32bd0",
      _id: "com.example.package-a",
      readme: "A demo package",
      _attachments: {},
    };
    const remotePkgInfoUp: PkgInfo = {
      name: "com.example.package-up",
      versions: {
        "1.0.0": {
          name: "com.example.package-up",
          displayName: "Package A",
          author: {
            name: "batman",
          },
          version: "1.0.0",
          unity: "2018.4",
          description: "A demo package",
          keywords: [""],
          category: "Unity",
          dependencies: {
            "com.example.package-up": "^1.0.0",
          },
          gitHead: "5c141ecfac59c389090a07540f44c8ac5d07a729",
          readmeFilename: "README.md",
          _id: "com.example.package-up@1.0.0",
          _nodeVersion: "12.13.1",
          _npmVersion: "6.12.1",
          dist: {
            integrity:
              "sha512-MAh44bur7HGyfbCXH9WKfaUNS67aRMfO0VAbLkr+jwseb1hJue/I1pKsC7PKksuBYh4oqoo9Jov1cBcvjVgjmA==",
            shasum: "516957cac4249f95cafab0290335def7d9703db7",
            tarball:
              "https://cdn.example.com/com.example.package-up/com.example.package-up-1.0.0.tgz",
          },
          contributors: [],
        },
      },
      time: {
        modified: "2019-11-28T18:51:58.123Z",
        created: "2019-11-28T18:51:58.123Z",
        "1.0.0": "2019-11-28T18:51:58.123Z",
      },
      users: {},
      "dist-tags": {
        latest: "1.0.0",
      },
      _rev: "3-418f950115c32bd0",
      _id: "com.example.package-up",
      readme: "A demo package",
      _attachments: {},
    };
    beforeEach(function () {
      removeWorkDir("test-openupm-cli");
      createWorkDir("test-openupm-cli", { manifest: true });
      startMockRegistry();
      registerRemotePkg(remotePkgInfoA);
      registerMissingPackage("pkg-not-exist");
      registerRemoteUpstreamPkg(remotePkgInfoUp);
      mockConsole = attachMockConsole();
    });
    afterEach(function () {
      removeWorkDir("test-openupm-cli");
      stopMockRegistry();
      mockConsole.detach();
    });
    it("view pkg", async function () {
      const retCode = await view("com.example.package-a", options);
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "com.example.package-a@1.0.0")
        .should.be.ok();
    });
    it("view pkg@1.0.0", async function () {
      const retCode = await view("com.example.package-a@1.0.0", options);
      retCode.should.equal(1);
      mockConsole.hasLineIncluding("out", "please replace").should.be.ok();
    });
    it("view pkg-not-exist", async function () {
      const retCode = await view("pkg-not-exist", options);
      retCode.should.equal(1);
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("view pkg from upstream", async function () {
      const retCode = await view("com.example.package-up", upstreamOptions);
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "com.example.package-up@1.0.0")
        .should.be.ok();
    });
    it("view pkg-not-exist from upstream", async function () {
      const retCode = await view("pkg-not-exist", upstreamOptions);
      retCode.should.equal(1);
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
  });
});
