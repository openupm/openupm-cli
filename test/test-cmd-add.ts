import "should";
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
import { shouldHaveDependency } from "./project-manifest-assertions";
import { buildPackument } from "./data-packument";
import { buildProjectManifest } from "./data-project-manifest";
import { domainName } from "../src/types/domain-name";
import { PackageUrl } from "../src/types/package-url";
import { semanticVersion } from "../src/types/semantic-version";
import { packageReference } from "../src/types/package-reference";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";
import { after } from "mocha";

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

    before(async function () {
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

    after(async function () {
      await mockProject.restore();
    });

    it("add pkg", async function () {
      const retCode = await add(packageA, options);
      retCode.should.equal(0);
      await mockProject.tryAssertManifest((manifest) =>
        manifest.should.deepEqual(expectedManifestA)
      );
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@1.0.0", async function () {
      const retCode = await add(
        packageReference(packageA, semanticVersion("1.0.0")),
        options
      );
      retCode.should.equal(0);
      await mockProject.tryAssertManifest((manifest) =>
        manifest.should.deepEqual(expectedManifestA)
      );
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@latest", async function () {
      const retCode = await add(packageReference(packageA, "latest"), options);
      retCode.should.equal(0);
      await mockProject.tryAssertManifest((manifest) =>
        manifest.should.deepEqual(expectedManifestA)
      );
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
      await mockProject.tryAssertManifest((manifest) =>
        manifest.should.deepEqual(expectedManifestA)
      );
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
      await mockProject.tryAssertManifest((manifest) =>
        manifest.should.deepEqual(expectedManifestA)
      );
      mockConsole.hasLineIncluding("out", "existed ").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@not-exist-version", async function () {
      const retCode = await add(
        packageReference(packageA, semanticVersion("2.0.0")),
        options
      );
      retCode.should.equal(1);
      await mockProject.tryAssertManifest((manifest) =>
        manifest.should.deepEqual(defaultManifest)
      );
      mockConsole
        .hasLineIncluding("out", "version 2.0.0 is not a valid choice")
        .should.be.ok();
      mockConsole.hasLineIncluding("out", "1.0.0").should.be.ok();
    });
    it("add pkg@http", async function () {
      const gitUrl = "https://github.com/yo/com.base.package-a" as PackageUrl;
      const retCode = await add(packageReference(packageA, gitUrl), options);
      retCode.should.equal(0);
      await mockProject.tryAssertManifest((manifest) =>
        shouldHaveDependency(manifest, packageA, gitUrl)
      );
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@git", async function () {
      const gitUrl = "git@github.com:yo/com.base.package-a" as PackageUrl;
      const retCode = await add(packageReference(packageA, gitUrl), options);
      retCode.should.equal(0);
      await mockProject.tryAssertManifest((manifest) =>
        shouldHaveDependency(manifest, packageA, gitUrl)
      );
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg@file", async function () {
      const fileUrl = "file../yo/com.base.package-a" as PackageUrl;
      const retCode = await add(packageReference(packageA, fileUrl), options);
      retCode.should.equal(0);
      await mockProject.tryAssertManifest((manifest) =>
        shouldHaveDependency(manifest, packageA, fileUrl)
      );
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg-not-exist", async function () {
      const retCode = await add(packageMissing, options);
      retCode.should.equal(1);
      await mockProject.tryAssertManifest((manifest) =>
        manifest.should.deepEqual(defaultManifest)
      );
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("add more than one pkgs", async function () {
      const retCode = await add([packageA, packageB], options);
      retCode.should.equal(0);
      await mockProject.tryAssertManifest((manifest) =>
        manifest.should.deepEqual(expectedManifestAB)
      );
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
      await mockProject.tryAssertManifest((manifest) =>
        manifest.should.deepEqual(expectedManifestUpstream)
      );
      mockConsole
        .hasLineIncluding("out", "added com.upstream.package-up")
        .should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg-not-exist from upstream", async function () {
      const retCode = await add(packageMissing, upstreamOptions);
      retCode.should.equal(1);
      await mockProject.tryAssertManifest((manifest) =>
        manifest.should.deepEqual(defaultManifest)
      );
      mockConsole.hasLineIncluding("out", "package not found").should.be.ok();
    });
    it("add pkg with nested dependencies", async function () {
      const retCode = await add(
        packageReference(packageC, "latest"),
        upstreamOptions
      );
      retCode.should.equal(0);
      await mockProject.tryAssertManifest((manifest) =>
        manifest.should.deepEqual(expectedManifestC)
      );
      mockConsole.hasLineIncluding("out", "added").should.be.ok();
      mockConsole.hasLineIncluding("out", "open Unity").should.be.ok();
    });
    it("add pkg with tests", async function () {
      const retCode = await add(packageA, testableOptions);
      retCode.should.equal(0);
      await mockProject.tryAssertManifest((manifest) =>
        manifest.should.deepEqual(expectedManifestTestable)
      );
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
