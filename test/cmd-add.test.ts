import { add, AddOptions } from "../src/cli/cmd-add";
import { exampleRegistryUrl } from "./mock-registry";
import { buildPackument } from "./data-packument";
import { buildProjectManifest } from "./data-project-manifest";
import { PackageUrl } from "../src/domain/package-url";
import { makePackageReference } from "../src/domain/package-reference";
import { makeDomainName } from "../src/domain/domain-name";
import { makeSemanticVersion } from "../src/domain/semantic-version";
import { spyOnLog } from "./log.mock";
import { mockResolvedPackuments } from "./packument-resolving.mock";
import { unityRegistryUrl } from "../src/domain/registry-url";
import {
  mockProjectManifest,
  spyOnSavedManifest,
} from "./project-manifest-io.mock";
import {
  addDependency,
  emptyProjectManifest,
} from "../src/domain/project-manifest";
import { mockUpmConfig } from "./upm-config-io.mock";
import { mockProjectVersion } from "./project-version-io.mock";

describe("cmd-add", () => {
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

    beforeEach(() => {
      spyOnSavedManifest();
      mockProjectManifest(emptyProjectManifest);
      mockUpmConfig(null);
      mockProjectVersion("2019.2.13f1");
    });

    it("should add packument without version", async () => {
      const noticeSpy = spyOnLog("notice");
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments([exampleRegistryUrl, remotePackumentA]);

      const addResult = await add(packageA, options);

      expect(addResult).toBeOk();
      expect(savedManifestSpy).toHaveBeenCalledWith(
        expect.any(String),
        expectedManifestA
      );
      expect(noticeSpy).toHaveLogLike("manifest", "added");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });

    it("should add packument with semantic version", async () => {
      const noticeSpy = spyOnLog("notice");
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments([exampleRegistryUrl, remotePackumentA]);

      const addResult = await add(
        makePackageReference(packageA, makeSemanticVersion("1.0.0")),
        options
      );

      expect(addResult).toBeOk();
      expect(savedManifestSpy).toHaveBeenCalledWith(
        expect.any(String),
        expectedManifestA
      );
      expect(noticeSpy).toHaveLogLike("manifest", "added");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });

    it("should add packument with latest tag", async () => {
      const noticeSpy = spyOnLog("notice");
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments([exampleRegistryUrl, remotePackumentA]);

      const addResult = await add(
        makePackageReference(packageA, "latest"),
        options
      );

      expect(addResult).toBeOk();
      expect(savedManifestSpy).toHaveBeenCalledWith(
        expect.any(String),
        expectedManifestA
      );
      expect(noticeSpy).toHaveLogLike("manifest", "added");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });

    it("should override packument with lower version", async () => {
      const noticeSpy = spyOnLog("notice");
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments([exampleRegistryUrl, remotePackumentA]);
      mockProjectManifest(
        // Manifest already had package with a lower version
        addDependency(expectedManifestA, packageA, makeSemanticVersion("0.1.0"))
      );

      const addResult = await add(
        makePackageReference(packageA, makeSemanticVersion("1.0.0")),
        options
      );

      expect(addResult).toBeOk();
      expect(savedManifestSpy).toHaveBeenCalledWith(
        expect.any(String),
        expectedManifestA
      );
      expect(noticeSpy).toHaveLogLike("manifest", "modified");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });

    it("should have no effect to add same packument twice", async () => {
      const noticeSpy = spyOnLog("notice");
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments([exampleRegistryUrl, remotePackumentA]);
      mockProjectManifest(
        // Manifest already had package with same version
        addDependency(expectedManifestA, packageA, makeSemanticVersion("1.0.0"))
      );

      const addResult = await add(
        makePackageReference(packageA, makeSemanticVersion("1.0.0")),
        options
      );

      expect(addResult).toBeOk();
      expect(savedManifestSpy).not.toHaveBeenCalled();
      expect(noticeSpy).toHaveLogLike("manifest", "existed");
    });

    it("should fail to add packument with unknown version", async () => {
      const warnSpy = spyOnLog("warn");
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments([exampleRegistryUrl, remotePackumentA]);

      const addResult = await add(
        makePackageReference(packageA, makeSemanticVersion("2.0.0")),
        options
      );

      expect(addResult).toBeError();
      expect(savedManifestSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveLogLike("404", "2.0.0 is not a valid choice");
    });

    it("should add packument with http version", async () => {
      const noticeSpy = spyOnLog("notice");
      const savedManifestSpy = spyOnSavedManifest();
      const gitUrl = "https://github.com/yo/com.base.package-a" as PackageUrl;

      const addResult = await add(
        makePackageReference(packageA, gitUrl),
        options
      );

      expect(addResult).toBeOk();
      expect(savedManifestSpy).toHaveBeenCalledWith(expect.any(String), {
        dependencies: { [packageA]: gitUrl },
      });
      expect(noticeSpy).toHaveLogLike("manifest", "added");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });

    it("should add packument with git version", async () => {
      const noticeSpy = spyOnLog("notice");
      const savedManifestSpy = spyOnSavedManifest();
      const gitUrl = "git@github.com:yo/com.base.package-a" as PackageUrl;

      const addResult = await add(
        makePackageReference(packageA, gitUrl),
        options
      );

      expect(addResult).toBeOk();
      expect(savedManifestSpy).toHaveBeenCalledWith(expect.any(String), {
        dependencies: { [packageA]: gitUrl },
      });
      expect(noticeSpy).toHaveLogLike("manifest", "added");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });

    it("should add packument with file version", async () => {
      const noticeSpy = spyOnLog("notice");
      const savedManifestSpy = spyOnSavedManifest();
      const fileUrl = "file../yo/com.base.package-a" as PackageUrl;

      const addResult = await add(
        makePackageReference(packageA, fileUrl),
        options
      );

      expect(addResult).toBeOk();
      expect(savedManifestSpy).toHaveBeenCalledWith(expect.any(String), {
        dependencies: { [packageA]: fileUrl },
      });
      expect(noticeSpy).toHaveLogLike("manifest", "added");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });

    it("should fail for unknown packument", async () => {
      const errorSpy = spyOnLog("error");
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments();

      const addResult = await add(packageMissing, options);

      expect(addResult).toBeError();
      expect(savedManifestSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveLogLike("404", "package not found");
    });

    it("should be able to add multiple packuments", async () => {
      const noticeSpy = spyOnLog("notice");
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments(
        [exampleRegistryUrl, remotePackumentA],
        [exampleRegistryUrl, remotePackumentB]
      );

      const addResult = await add([packageA, packageB], options);

      expect(addResult).toBeOk();
      expect(savedManifestSpy).toHaveBeenCalledWith(
        expect.any(String),
        expectedManifestAB
      );
      expect(noticeSpy).toHaveLogLike("manifest", "added com.base.package-a");
      expect(noticeSpy).toHaveLogLike("manifest", "added com.base.package-b");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });

    it("should add upstream packument", async () => {
      const noticeSpy = spyOnLog("notice");
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments([unityRegistryUrl, remotePackumentUp]);

      const addResult = await add(packageUp, upstreamOptions);

      expect(addResult).toBeOk();
      expect(savedManifestSpy).toHaveBeenCalledWith(
        expect.any(String),
        expectedManifestUpstream
      );
      expect(noticeSpy).toHaveLogLike(
        "manifest",
        "added com.upstream.package-up"
      );
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });

    it("should fail for unknown upstream packument", async () => {
      const errorSpy = spyOnLog("error");
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments();

      const addResult = await add(packageMissing, upstreamOptions);

      expect(addResult).toBeError();
      expect(savedManifestSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveLogLike("404", "package not found");
    });

    it("should add packument dependencies", async () => {
      const noticeSpy = spyOnLog("notice");
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments(
        [exampleRegistryUrl, remotePackumentC],
        [exampleRegistryUrl, remotePackumentD],
        [unityRegistryUrl, remotePackumentUp]
      );

      const addResult = await add(
        makePackageReference(packageC, "latest"),
        upstreamOptions
      );

      expect(addResult).toBeOk();
      expect(savedManifestSpy).toHaveBeenCalledWith(
        expect.any(String),
        expectedManifestC
      );
      expect(noticeSpy).toHaveLogLike("manifest", "added");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });

    it("should packument to testables when requested", async () => {
      const noticeSpy = spyOnLog("notice");
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments([exampleRegistryUrl, remotePackumentA]);

      const addResult = await add(packageA, testableOptions);

      expect(addResult).toBeOk();
      expect(savedManifestSpy).toHaveBeenCalledWith(
        expect.any(String),
        expectedManifestTestable
      );
      expect(noticeSpy).toHaveLogLike("manifest", "added");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });

    it("should add packument with lower editor-version", async () => {
      const noticeSpy = spyOnLog("notice");
      mockResolvedPackuments([
        exampleRegistryUrl,
        remotePackumentWithLowerEditorVersion,
      ]);

      const addResult = await add(packageLowerEditor, testableOptions);

      expect(addResult).toBeOk();
      expect(noticeSpy).toHaveLogLike("manifest", "added");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });

    it("should fail to add packument with higher editor-version", async () => {
      const warnSpy = spyOnLog("warn");
      mockResolvedPackuments([
        exampleRegistryUrl,
        remotePackumentWithHigherEditorVersion,
      ]);

      const addResult = await add(packageHigherEditor, testableOptions);

      expect(addResult).toBeError();
      expect(warnSpy).toHaveLogLike(
        "editor.version",
        "requires 2020.2 but found 2019.2.13f1"
      );
    });

    it("should add packument with higher editor-version when forced", async () => {
      const warnSpy = spyOnLog("warn");
      mockResolvedPackuments([
        exampleRegistryUrl,
        remotePackumentWithHigherEditorVersion,
      ]);

      const addResult = await add(packageHigherEditor, forceOptions);

      expect(addResult).toBeOk();
      expect(warnSpy).toHaveLogLike(
        "editor.version",
        "requires 2020.2 but found 2019.2.13f1"
      );
    });

    it("should not add packument with bad editor-version", async () => {
      const warnSpy = spyOnLog("warn");
      mockResolvedPackuments([
        exampleRegistryUrl,
        remotePackumentWithWrongEditorVersion,
      ]);

      const addResult = await add(packageWrongEditor, testableOptions);

      expect(addResult).toBeError();
      expect(warnSpy).toHaveLogLike("package.unity", "2020 is not valid");
    });

    it("should add packument with bad editor-version when forced", async () => {
      const warnSpy = spyOnLog("warn");
      mockResolvedPackuments([
        exampleRegistryUrl,
        remotePackumentWithWrongEditorVersion,
      ]);

      const addResult = await add(packageWrongEditor, forceOptions);

      expect(addResult).toBeOk();
      expect(warnSpy).toHaveLogLike("package.unity", "2020 is not valid");
    });

    it("should perform multiple adds atomically", async () => {
      const savedManifestSpy = spyOnSavedManifest();
      mockResolvedPackuments(
        [exampleRegistryUrl, remotePackumentA],
        [exampleRegistryUrl, remotePackumentB]
      );

      const addResult = await add(
        // Second package will fail.
        // Because of this the whole operation should fail.
        [packageA, packageMissing, packageB],
        upstreamOptions
      );

      expect(addResult).toBeError();
      // Since not all packages could be added, the manifest should not be modified.
      expect(savedManifestSpy).not.toHaveBeenCalled();
    });
  });
});
