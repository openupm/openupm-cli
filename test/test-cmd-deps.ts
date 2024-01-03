import "should";
import { deps, DepsOptions } from "../src/cmd-deps";
import {
  exampleRegistryUrl,
  registerMissingPackument,
  registerRemotePackument,
  registerRemoteUpstreamPackument,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import { createWorkDir, getWorkDir, removeWorkDir } from "./mock-work-dir";
import { attachMockConsole, MockConsole } from "./mock-console";
import { buildPackument } from "./data-packument";
import { domainName } from "../src/types/domain-name";
import { packageReference } from "../src/types/package-reference";

describe("cmd-deps.ts", function () {
  const options: DepsOptions = {
    _global: {
      registry: exampleRegistryUrl,
      chdir: getWorkDir("test-openupm-cli"),
    },
  };
  describe("deps", function () {
    let mockConsole: MockConsole = null!;

    const remotePackumentA = buildPackument(
      "com.example.package-a",
      (packument) =>
        packument.addVersion("1.0.0", (version) =>
          version.addDependency("com.example.package-b", "1.0.0")
        )
    );
    const remotePackumentB = buildPackument(
      "com.example.package-b",
      (packument) =>
        packument.addVersion("1.0.0", (version) =>
          version.addDependency("com.example.package-up", "1.0.0")
        )
    );
    const remotePackumentUp = buildPackument(
      "com.example.package-up",
      (packument) => packument.addVersion("1.0.0")
    );

    beforeEach(function () {
      removeWorkDir("test-openupm-cli");
      createWorkDir("test-openupm-cli", { manifest: true });
      startMockRegistry();
      registerRemotePackument(remotePackumentA);
      registerRemotePackument(remotePackumentB);
      registerMissingPackument("pkg-not-exist");
      registerRemoteUpstreamPackument(remotePackumentUp);

      mockConsole = attachMockConsole();
    });
    afterEach(function () {
      removeWorkDir("test-openupm-cli");
      stopMockRegistry();
      mockConsole.detach();
    });
    it("deps pkg", async function () {
      const retCode = await deps(remotePackumentA.name, options);
      retCode.should.equal(0);
      mockConsole.hasLineIncluding("out", remotePackumentB.name).should.be.ok();
    });
    it("deps pkg --deep", async function () {
      const retCode = await deps(remotePackumentA.name, {
        ...options,
        deep: true,
      });
      retCode.should.equal(0);
      mockConsole.hasLineIncluding("out", remotePackumentB.name).should.be.ok();
      mockConsole
        .hasLineIncluding("out", remotePackumentUp.name)
        .should.be.ok();
    });
    it("deps pkg@latest", async function () {
      const retCode = await deps(
        packageReference(remotePackumentA.name, "latest"),
        options
      );
      retCode.should.equal(0);
      mockConsole.hasLineIncluding("out", remotePackumentB.name).should.be.ok();
    });
    it("deps pkg@1.0.0", async function () {
      const retCode = await deps(
        packageReference(remotePackumentA.name, "1.0.0"),
        options
      );
      retCode.should.equal(0);
      mockConsole.hasLineIncluding("out", remotePackumentB.name).should.be.ok();
    });
    it("deps pkg@not-exist-version", async function () {
      const retCode = await deps(
        packageReference(remotePackumentA.name, "2.0.0"),
        options
      );
      retCode.should.equal(0);
      mockConsole
        .hasLineIncluding("out", "is not a valid choice")
        .should.be.ok();
    });
    it("deps pkg-not-exist", async function () {
      const retCode = await deps(domainName("pkg-not-exist"), options);
      retCode.should.equal(0);
      mockConsole.hasLineIncluding("out", "not found").should.be.ok();
    });
    it("deps pkg upstream", async function () {
      const retCode = await deps(remotePackumentUp.name, options);
      retCode.should.equal(0);
    });
  });
});
