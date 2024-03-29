import { add, AddOptions } from "../src/cmd-add";
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
import { buildProjectManifest } from "./data-project-manifest";
import { PackageUrl } from "../src/domain/package-url";
import { makePackageReference } from "../src/domain/package-reference";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";
import { makeDomainName } from "../src/domain/domain-name";
import { makeSemanticVersion } from "../src/domain/semantic-version";

describe("cmd-add.ts", () => {
  const packageMissing = makeDomainName("pkg-not-exist");
  const packageA = makeDomainName("com.base.package-a");
  const packageB = makeDomainName("com.base.package-b");
  const packageC = makeDomainName("com.base.package-c");
  const packageD = makeDomainName("com.base.package-d");
  const packageUp = makeDomainName("com.upstream.package-up");
  const packageLowerEditor = makeDomainName(
    "com.base.package-with-lower-editor-version"
  );
  const packageHigherEditor = makeDomainName(
    "com.base.package-with-higher-editor-version"
  );
  const packageWrongEditor = makeDomainName(
    "com.base.package-with-wrong-editor-version"
  );

  const options: AddOptions = {
    _global: {
      registry: exampleRegistryUrl,
      upstream: false,
    },
  };
  const upstreamOptions: AddOptions = {
    _global: {
      registry: exampleRegistryUrl,
      upstream: true,
    },
  };
  const testableOptions: AddOptions = {
    _global: {
      registry: exampleRegistryUrl,
      upstream: false,
    },
    test: true,
  };
  const forceOptions: AddOptions = {
    _global: {
      registry: exampleRegistryUrl,
      upstream: false,
    },
    force: true,
  };
  describe("add", () => {
    let mockConsole: MockConsole = null!;
    let mockProject: MockUnityProject = null!;

    const remotePackumentA = buildPackument(packageA, (packument) =>
      packument.addVersion("0.1.0").addVersion("1.0.0")
    );
    const remotePackumentB = buildPackument(packageB, (packument) =>
      packument.addVersion("1.0.0")
    );
    const remotePackumentC = buildPackument(packageC, (packument) =>
      packument.addVersion("1.0.0", (version) =>
        version
          .addDependency(packageD, "1.0.0")
          .addDependency("com.unity.modules.x", "1.0.0")
      )
    );
    const remotePackumentD = buildPackument(packageD, (packument) =>
      packument.addVersion("1.0.0", (version) => {
        return version.addDependency(packageUp, "1.0.0");
      })
    );
    const remotePackumentWithLowerEditorVersion = buildPackument(
      packageLowerEditor,
      (packument) =>
        packument.addVersion("1.0.0", (version) =>
          version.set("unity", "2019.1").set("unityRelease", "0b1")
        )
    );
    const remotePackumentWithHigherEditorVersion = buildPackument(
      packageHigherEditor,
      (packument) =>
        packument.addVersion("1.0.0", (version) =>
          version.set("unity", "2020.2")
        )
    );

    const remotePackumentWithWrongEditorVersion = buildPackument(
      packageWrongEditor,
      (packument) =>
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore 2020 is not a valid major.minor version, but this is on purpose for this test
        packument.addVersion("1.0.0", (version) => version.set("unity", "2020"))
    );
    const remotePackumentUp = buildPackument(packageUp, (packument) =>
      packument.addVersion("1.0.0")
    );

    const defaultManifest = buildProjectManifest();
    const expectedManifestA = buildProjectManifest((manifest) =>
      manifest.addDependency(packageA, "1.0.0", true, false)
    );
    const expectedManifestAB = buildProjectManifest((manifest) =>
      manifest
        .addDependency(packageA, "1.0.0", true, false)
        .addDependency(packageB, "1.0.0", true, false)
    );
    const expectedManifestC = buildProjectManifest((manifest) =>
      manifest.addDependency(packageC, "1.0.0", true, false).addScope(packageD)
    );
    const expectedManifestUpstream = buildProjectManifest((manifest) =>
      manifest.addDependency(packageUp, "1.0.0", false, false)
    );
    const expectedManifestTestable = buildProjectManifest((manifest) =>
      manifest.addDependency(packageA, "1.0.0", true, true)
    );

    beforeAll(async function () {
      mockProject = await setupUnityProject({ version: "2019.2.13f1" });
    });

    beforeEach(function () {
      startMockRegistry();
      registerRemotePackument(remotePackumentA);
      registerRemotePackument(remotePackumentB);
      registerRemotePackument(remotePackumentC);
      registerRemotePackument(remotePackumentD);
      registerRemotePackument(remotePackumentWithLowerEditorVersion);
      registerRemotePackument(remotePackumentWithHigherEditorVersion);
      registerRemotePackument(remotePackumentWithWrongEditorVersion);
      registerRemoteUpstreamPackument(remotePackumentUp);
      registerMissingPackument(packageMissing);

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

    it("should add packument without version", async function () {
      const addResult = await add(packageA, options);
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestA)
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should add packument with semantic version", async function () {
      const addResult = await add(
        makePackageReference(packageA, makeSemanticVersion("1.0.0")),
        options
      );
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestA)
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should add packument with latest tag", async function () {
      const addResult = await add(
        makePackageReference(packageA, "latest"),
        options
      );
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestA)
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should override packument with lower version", async function () {
      const addResult1 = await add(
        makePackageReference(packageA, makeSemanticVersion("0.1.0")),
        options
      );
      expect(addResult1).toBeOk();
      const addResult2 = await add(
        makePackageReference(packageA, makeSemanticVersion("1.0.0")),
        options
      );
      expect(addResult2).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestA)
      );
      expect(mockConsole).toHaveLineIncluding("out", "modified ");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should have no effect to add same packument twice", async function () {
      const addResult1 = await add(
        makePackageReference(packageA, makeSemanticVersion("1.0.0")),
        options
      );
      expect(addResult1).toBeOk();
      const addResult2 = await add(
        makePackageReference(packageA, makeSemanticVersion("1.0.0")),
        options
      );
      expect(addResult2).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestA)
      );
      expect(mockConsole).toHaveLineIncluding("out", "existed ");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should fail to add packument with unknown version", async function () {
      const addResult = await add(
        makePackageReference(packageA, makeSemanticVersion("2.0.0")),
        options
      );
      expect(addResult).toBeError();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(defaultManifest)
      );
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "version 2.0.0 is not a valid choice"
      );

      expect(mockConsole).toHaveLineIncluding("out", "1.0.0");
    });
    it("should add packument with http version", async function () {
      const gitUrl = "https://github.com/yo/com.base.package-a" as PackageUrl;
      const addResult = await add(
        makePackageReference(packageA, gitUrl),
        options
      );
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toHaveDependency(packageA, gitUrl)
      );
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).not.toHaveScopedRegistries()
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should add packument with git version", async function () {
      const gitUrl = "git@github.com:yo/com.base.package-a" as PackageUrl;
      const addResult = await add(
        makePackageReference(packageA, gitUrl),
        options
      );
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toHaveDependency(packageA, gitUrl)
      );
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).not.toHaveScopedRegistries()
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should add packument with file version", async function () {
      const fileUrl = "file../yo/com.base.package-a" as PackageUrl;
      const addResult = await add(
        makePackageReference(packageA, fileUrl),
        options
      );
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toHaveDependency(packageA, fileUrl)
      );
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).not.toHaveScopedRegistries()
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should fail for unknown packument", async function () {
      const addResult = await add(packageMissing, options);
      expect(addResult).toBeError();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(defaultManifest)
      );
      expect(mockConsole).toHaveLineIncluding("out", "package not found");
    });
    it("should be able to add multiple packuments", async function () {
      const addResult = await add([packageA, packageB], options);
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestAB)
      );
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "added com.base.package-a"
      );
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "added com.base.package-b"
      );
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should add upstream packument", async function () {
      const addResult = await add(packageUp, upstreamOptions);
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestUpstream)
      );
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "added com.upstream.package-up"
      );
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should fail for unknown upstream packument", async function () {
      const addResult = await add(packageMissing, upstreamOptions);
      expect(addResult).toBeError();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(defaultManifest)
      );
      expect(mockConsole).toHaveLineIncluding("out", "package not found");
    });
    it("should add packument dependencies", async function () {
      const addResult = await add(
        makePackageReference(packageC, "latest"),
        upstreamOptions
      );
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestC)
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should packument to testables when requested", async function () {
      const addResult = await add(packageA, testableOptions);
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestTestable)
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should add packument with lower editor-version", async function () {
      const addResult = await add(packageLowerEditor, testableOptions);
      expect(addResult).toBeOk();
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("should fail to add packument with higher editor-version", async function () {
      const addResult = await add(packageHigherEditor, testableOptions);
      expect(addResult).toBeError();
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "requires 2020.2 but found 2019.2.13f1"
      );
    });
    it("should add packument with higher editor-version when forced", async function () {
      const addResult = await add(packageHigherEditor, forceOptions);
      expect(addResult).toBeOk();
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "requires 2020.2 but found 2019.2.13f1"
      );
    });
    it("should not add packument with bad editor-version", async function () {
      const addResult = await add(packageWrongEditor, testableOptions);
      expect(addResult).toBeError();
      expect(mockConsole).toHaveLineIncluding("out", "2020 is not valid");
    });
    it("should add packument with bad editor-version when forced", async function () {
      const addResult = await add(packageWrongEditor, forceOptions);
      expect(addResult).toBeOk();
      expect(mockConsole).toHaveLineIncluding("out", "2020 is not valid");
    });
  });
});
