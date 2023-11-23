import "should";
import { deps, DepsOptions } from "../src/cmd-deps";
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
import { buildPackageInfo } from "./data-pkg-info";

describe("cmd-deps.ts", function () {
  const options: DepsOptions = {
    _global: {
      registry: exampleRegistryUrl,
      chdir: getWorkDir("test-openupm-cli"),
    },
  };
  describe("deps", function () {
    let mockConsole: MockConsole = null!;

    const remotePkgInfoA = buildPackageInfo("com.example.package-a", (pkg) =>
      pkg.addVersion("1.0.0", (version) =>
        version.addDependency("com.example.package-b", "1.0.0")
      )
    );
    const remotePkgInfoB = buildPackageInfo("com.example.package-b", (pkg) =>
      pkg.addVersion("1.0.0", (version) =>
        version.addDependency("com.example.package-up", "1.0.0")
      )
    );
    const remotePkgInfoUp = buildPackageInfo("com.example.package-up", (pkg) =>
      pkg.addVersion("1.0.0")
    );

    beforeEach(function () {
      removeWorkDir("test-openupm-cli");
      createWorkDir("test-openupm-cli", { manifest: true });
      startMockRegistry();
      registerRemotePkg(remotePkgInfoA);
      registerRemotePkg(remotePkgInfoB);
      registerMissingPackage("pkg-not-exist");
      registerRemoteUpstreamPkg(remotePkgInfoUp);

      mockConsole = attachMockConsole();
    });
    afterEach(function () {
      removeWorkDir("test-openupm-cli");
      stopMockRegistry();
      mockConsole.detach();
    });
    it("deps pkg", async function () {
      const retCode = await deps("com.example.package-a", options);
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "com.example.package-b")
        .should.be.ok();
    });
    it("deps pkg --deep", async function () {
      const retCode = await deps("com.example.package-a", {
        ...options,
        deep: true,
      });
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "com.example.package-b")
        .should.be.ok();
      mockConsole
        .hasLineIncluding("out", "com.example.package-up")
        .should.be.ok();
    });
    it("deps pkg@latest", async function () {
      const retCode = await deps("com.example.package-a@latest", options);
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "com.example.package-b")
        .should.be.ok();
    });
    it("deps pkg@1.0.0", async function () {
      const retCode = await deps("com.example.package-a@1.0.0", options);
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "com.example.package-b")
        .should.be.ok();
    });
    it("deps pkg@not-exist-version", async function () {
      const retCode = await deps("com.example.package-a@2.0.0", options);
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "is not a valid choice")
        .should.be.ok();
    });
    it("deps pkg-not-exist", async function () {
      const retCode = await deps("pkg-not-exist", options);
      retCode.should.equal(0);
      mockConsole.hasLineIncluding("out", "not found").should.be.ok();
    });
    it("deps pkg upstream", async function () {
      const retCode = await deps("com.example.package-up", options);
      retCode.should.equal(0);
    });
  });
});
