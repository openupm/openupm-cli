import { deps, DepsOptions } from "../src/cmd-deps";
import {
  exampleRegistryUrl,
  registerMissingPackument,
  registerRemotePackument,
  registerRemoteUpstreamPackument,
  startMockRegistry,
  stopMockRegistry,
} from "./mock-registry";
import { attachMockConsole, MockConsole } from "./mock-console";
import { buildPackument } from "./data-packument";
import { makeDomainName } from "../src/types/domain-name";
import { makePackageReference } from "../src/types/package-reference";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";

describe("cmd-deps.ts", () => {
  const options: DepsOptions = {
    _global: {
      registry: exampleRegistryUrl,
    },
  };
  describe("deps", () => {
    let mockConsole: MockConsole = null!;
    let mockProject: MockUnityProject = null!;

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

    beforeAll(async function () {
      mockProject = await setupUnityProject({});
    });

    beforeEach(function () {
      startMockRegistry();
      registerRemotePackument(remotePackumentA);
      registerRemotePackument(remotePackumentB);
      registerMissingPackument("pkg-not-exist");
      registerRemoteUpstreamPackument(remotePackumentUp);

      mockConsole = attachMockConsole();
    });
    afterEach(async function () {
      await mockProject.reset();
      stopMockRegistry();
      mockConsole.detach();
    });
    afterAll(async function () {
      await mockProject.restore();
    });

    it("deps pkg", async function () {
      const depsResult = await deps(remotePackumentA.name, options);
      expect(depsResult).toBeOk();
      expect(mockConsole).toHaveLineIncluding("out", remotePackumentB.name);
    });
    it("deps pkg --deep", async function () {
      const depsResult = await deps(remotePackumentA.name, {
        ...options,
        deep: true,
      });
      expect(depsResult).toBeOk();
      expect(mockConsole).toHaveLineIncluding("out", remotePackumentB.name);
      expect(mockConsole).toHaveLineIncluding("out", remotePackumentUp.name);
    });
    it("deps pkg@latest", async function () {
      const depsResult = await deps(
        makePackageReference(remotePackumentA.name, "latest"),
        options
      );
      expect(depsResult).toBeOk();
      expect(mockConsole).toHaveLineIncluding("out", remotePackumentB.name);
    });
    it("deps pkg@1.0.0", async function () {
      const depsResult = await deps(
        makePackageReference(remotePackumentA.name, "1.0.0"),
        options
      );
      expect(depsResult).toBeOk();
      expect(mockConsole).toHaveLineIncluding("out", remotePackumentB.name);
    });
    it("deps pkg@not-exist-version", async function () {
      const depsResult = await deps(
        makePackageReference(remotePackumentA.name, "2.0.0"),
        options
      );
      expect(depsResult).toBeOk();
      expect(mockConsole).toHaveLineIncluding("out", "is not a valid choice");
    });
    it("deps pkg-not-exist", async function () {
      const depsResult = await deps(makeDomainName("pkg-not-exist"), options);
      expect(depsResult).toBeOk();
      expect(mockConsole).toHaveLineIncluding("out", "not found");
    });
    it("deps pkg upstream", async function () {
      const depsResult = await deps(remotePackumentUp.name, options);
      expect(depsResult).toBeOk();
    });
  });
});
