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
import { domainName } from "../src/types/domain-name";
import { PackageUrl } from "../src/types/package-url";
import { semanticVersion } from "../src/types/semantic-version";
import { packageReference } from "../src/types/package-reference";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";

describe("cmd-add.ts", function () {
  const packageMissing = domainName("pkg-not-exist");
  const packageA = domainName("com.base.package-a");
  const packageB = domainName("com.base.package-b");
  const packageC = domainName("com.base.package-c");
  const packageD = domainName("com.base.package-d");
  const packageUp = domainName("com.upstream.package-up");
  const packageLowerEditor = domainName(
    "com.base.package-with-lower-editor-version"
  );
  const packageHigherEditor = domainName(
    "com.base.package-with-higher-editor-version"
  );
  const packageWrongEditor = domainName(
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
  describe("add", function () {
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

    it("add pkg", async function () {
      const addResult = await add(packageA, options);
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestA)
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("add pkg@1.0.0", async function () {
      const addResult = await add(
        packageReference(packageA, semanticVersion("1.0.0")),
        options
      );
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestA)
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("add pkg@latest", async function () {
      const addResult = await add(
        packageReference(packageA, "latest"),
        options
      );
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestA)
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("add pkg@0.1.0 then pkg@1.0.0", async function () {
      const addResult1 = await add(
        packageReference(packageA, semanticVersion("0.1.0")),
        options
      );
      expect(addResult1).toBeOk();
      const addResult2 = await add(
        packageReference(packageA, semanticVersion("1.0.0")),
        options
      );
      expect(addResult2).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestA)
      );
      expect(mockConsole).toHaveLineIncluding("out", "modified ");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("add exited pkg version", async function () {
      const addResult1 = await add(
        packageReference(packageA, semanticVersion("1.0.0")),
        options
      );
      expect(addResult1).toBeOk();
      const addResult2 = await add(
        packageReference(packageA, semanticVersion("1.0.0")),
        options
      );
      expect(addResult2).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestA)
      );
      expect(mockConsole).toHaveLineIncluding("out", "existed ");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("add pkg@not-exist-version", async function () {
      const addResult = await add(
        packageReference(packageA, semanticVersion("2.0.0")),
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
    it("add pkg@http", async function () {
      const gitUrl = "https://github.com/yo/com.base.package-a" as PackageUrl;
      const addResult = await add(packageReference(packageA, gitUrl), options);
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
    it("add pkg@git", async function () {
      const gitUrl = "git@github.com:yo/com.base.package-a" as PackageUrl;
      const addResult = await add(packageReference(packageA, gitUrl), options);
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
    it("add pkg@file", async function () {
      const fileUrl = "file../yo/com.base.package-a" as PackageUrl;
      const addResult = await add(packageReference(packageA, fileUrl), options);
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
    it("add pkg-not-exist", async function () {
      const addResult = await add(packageMissing, options);
      expect(addResult).toBeError();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(defaultManifest)
      );
      expect(mockConsole).toHaveLineIncluding("out", "package not found");
    });
    it("add more than one pkgs", async function () {
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
    it("add pkg from upstream", async function () {
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
    it("add pkg-not-exist from upstream", async function () {
      const addResult = await add(packageMissing, upstreamOptions);
      expect(addResult).toBeError();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(defaultManifest)
      );
      expect(mockConsole).toHaveLineIncluding("out", "package not found");
    });
    it("add pkg with nested dependencies", async function () {
      const addResult = await add(
        packageReference(packageC, "latest"),
        upstreamOptions
      );
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestC)
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("add pkg with tests", async function () {
      const addResult = await add(packageA, testableOptions);
      expect(addResult).toBeOk();
      await mockProject.tryAssertManifest((manifest) =>
        expect(manifest).toEqual(expectedManifestTestable)
      );
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("add pkg with lower editor version", async function () {
      const addResult = await add(packageLowerEditor, testableOptions);
      expect(addResult).toBeOk();
      expect(mockConsole).toHaveLineIncluding("out", "added");
      expect(mockConsole).toHaveLineIncluding("out", "open Unity");
    });
    it("add pkg with higher editor version", async function () {
      const addResult = await add(packageHigherEditor, testableOptions);
      expect(addResult).toBeError();
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "requires 2020.2 but found 2019.2.13f1"
      );
    });
    it("force add pkg with higher editor version", async function () {
      const addResult = await add(packageHigherEditor, forceOptions);
      expect(addResult).toBeOk();
      expect(mockConsole).toHaveLineIncluding(
        "out",
        "requires 2020.2 but found 2019.2.13f1"
      );
    });
    it("add pkg with wrong editor version", async function () {
      const addResult = await add(packageWrongEditor, testableOptions);
      expect(addResult).toBeError();
      expect(mockConsole).toHaveLineIncluding("out", "2020 is not valid");
    });
    it("force add pkg with wrong editor version", async function () {
      const addResult = await add(packageWrongEditor, forceOptions);
      expect(addResult).toBeOk();
      expect(mockConsole).toHaveLineIncluding("out", "2020 is not valid");
    });
  });
});
