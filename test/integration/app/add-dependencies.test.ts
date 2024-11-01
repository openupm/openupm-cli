import nock from "nock";
import {
  addDependenciesUsing,
  CompatibilityCheckFailedError,
  PackageIncompatibleError,
  UnresolvedDependenciesError,
} from "../../../src/app/add-dependencies.js";
import { PackumentNotFoundError } from "../../../src/domain/common-errors.js";
import type { AddResult } from "../../../src/domain/dependency-management.js";
import { DomainName } from "../../../src/domain/domain-name.js";
import { makeEditorVersion } from "../../../src/domain/editor-version.js";
import { partialApply } from "../../../src/domain/fp-utils.js";
import { noopLogger } from "../../../src/domain/logging.js";
import { emptyProjectManifest } from "../../../src/domain/project-manifest.js";
import { unityRegistry } from "../../../src/domain/registry.js";
import { unityRegistryUrl } from "../../../src/domain/registry-url.js";
import { SemanticVersion } from "../../../src/domain/semantic-version.js";
import { getRegistryPackumentUsing } from "../../../src/io/registry.js";
import { fetchCheckUrlExists } from "../../../src/io/www.js";
import { buildPackument } from "../../common/data-packument.js";
import { buildProjectManifest } from "../../common/data-project-manifest.js";
import {
  otherRegistry,
  otherRegistryUrl,
  someRegistry,
  someRegistryUrl,
} from "../../common/data-registry.js";
import { makeMockLogger } from "../../common/log.mock.js";
import { MockFs } from "../fs.mock.js";
import { mockRegistryPackuments } from "../registry.mock.js";

describe("add dependencies", () => {
  const someVersion = SemanticVersion.parse("1.0.0");
  const unknownPackage = DomainName.parse("com.unknown.parse");

  const otherPackument = buildPackument("com.other.package", (packument) =>
    packument.addVersion(someVersion, (version) =>
      version.set("unity", "2022.2")
    )
  );

  const somePackument = buildPackument("com.some.package", (packument) =>
    packument.addVersion(someVersion, (version) =>
      version
        .set("unity", "2022.2")
        .addDependency(otherPackument.name, someVersion)
    )
  );

  const anotherPackument = buildPackument("com.another.package", (packument) =>
    packument.addVersion(someVersion, (version) =>
      version
        .set("unity", "2022.2")
        .addDependency(somePackument.name, someVersion)
    )
  );

  const badEditorPackument = buildPackument("com.bad.package", (packument) =>
    packument.addVersion(someVersion, (version) =>
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      version.set("unity", "bad value")
    )
  );
  const incompatiblePackument = buildPackument(
    "com.incompatible.package",
    (packument) =>
      packument.addVersion(someVersion, (version) =>
        version.set("unity", "2023.1")
      )
  );
  const packumentWithBadDependency = buildPackument(
    "com.bad-dep.package",
    (packument) =>
      packument.addVersion(someVersion, (version) =>
        version.addDependency(unknownPackage, someVersion)
      )
  );

  const someProjectDir = "/users/some-user/projects/SomeProject";

  function makeDependencies() {
    const fetchPackument = getRegistryPackumentUsing(noopLogger);

    const log = makeMockLogger();

    const mockFs = MockFs.makeEmpty()
      .putUnityProject({
        projectDirectory: someProjectDir,
      })
      .putHomeUpmConfig({});

    const addDependencies = partialApply(
      addDependenciesUsing,
      mockFs.read,
      mockFs.write,
      fetchPackument,
      fetchCheckUrlExists,
      noopLogger
    );
    return {
      addDependencies,
      mockFs,
      log,
    } as const;
  }

  afterEach(() => {
    nock.cleanAll();
  });

  beforeEach(() => {
    mockRegistryPackuments(otherRegistryUrl, [anotherPackument]);
    mockRegistryPackuments(someRegistryUrl, [
      somePackument,
      packumentWithBadDependency,
      badEditorPackument,
      incompatiblePackument,
    ]);
    mockRegistryPackuments(unityRegistryUrl, [otherPackument]);
  });

  it("should add package with invalid editor version when running with force", async () => {
    const { addDependencies } = makeDependencies();

    const result = await addDependencies(
      someProjectDir,
      null,
      [someRegistry, unityRegistry],
      true,
      false,
      [badEditorPackument.name]
    );

    expect(result).toEqual({
      [badEditorPackument.name]: {
        type: "added",
        version: someVersion,
      } satisfies AddResult,
    });
  });

  it("should add package with incompatible with editor when running with force", async () => {
    const { addDependencies } = makeDependencies();

    const result = await addDependencies(
      someProjectDir,
      null,
      [someRegistry, unityRegistry],
      true,
      false,
      [incompatiblePackument.name]
    );

    expect(result).toEqual({
      [incompatiblePackument.name]: {
        type: "added",
        version: someVersion,
      } satisfies AddResult,
    });
  });

  it("should fail when adding package with incompatible with editor and not running with force", async () => {
    const { addDependencies } = makeDependencies();

    await expect(
      addDependencies(
        someProjectDir,
        makeEditorVersion(2020, 1, 1, "f", 1),
        [someRegistry, unityRegistry],
        false,
        false,
        [incompatiblePackument.name]
      )
    ).rejects.toBeInstanceOf(PackageIncompatibleError);
  });

  it("should fail if package could not be resolved", async () => {
    const { addDependencies } = makeDependencies();

    await expect(() =>
      addDependencies(
        someProjectDir,
        makeEditorVersion(2020, 1, 1, "f", 1),
        [someRegistry, unityRegistry],
        true,
        false,
        [unknownPackage]
      )
    ).rejects.toBeInstanceOf(PackumentNotFoundError);
  });

  it("should fail if packument had malformed target editor and not running with force", async () => {
    const { addDependencies } = makeDependencies();

    await expect(() =>
      addDependencies(
        someProjectDir,
        makeEditorVersion(2020, 1, 1, "f", 1),
        [someRegistry, unityRegistry],
        false,
        false,
        [badEditorPackument.name]
      )
    ).rejects.toBeInstanceOf(CompatibilityCheckFailedError);
  });

  it("should fail if dependency could not be resolved and not running with force", async () => {
    const { addDependencies } = makeDependencies();

    await expect(() =>
      addDependencies(
        someProjectDir,
        null,
        [someRegistry, unityRegistry],
        false,
        false,
        [packumentWithBadDependency.name]
      )
    ).rejects.toBeInstanceOf(UnresolvedDependenciesError);
  });

  it("should add package with unresolved dependency when running with force", async () => {
    const { addDependencies } = makeDependencies();

    const result = await addDependencies(
      someProjectDir,
      null,
      [someRegistry, unityRegistry],
      true,
      false,
      [packumentWithBadDependency.name]
    );

    expect(result).toEqual({
      [packumentWithBadDependency.name]: {
        type: "added",
        version: someVersion,
      } satisfies AddResult,
    });
  });

  it("should add package to manifest", async () => {
    const { addDependencies, mockFs } = makeDependencies();

    await addDependencies(
      someProjectDir,
      null,
      [someRegistry, unityRegistry],
      false,
      false,
      [somePackument.name]
    );

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
      expect.objectContaining({
        dependencies: { [somePackument.name]: someVersion },
      })
    );
  });

  it("should replace package", async () => {
    const { addDependencies, mockFs } = makeDependencies();
    mockFs.putUnityProject({
      projectDirectory: someProjectDir,
      manifest: buildProjectManifest((manifest) =>
        manifest.addDependency(somePackument.name, "0.1.0", true, true)
      ),
    });

    await addDependencies(
      someProjectDir,
      null,
      [someRegistry, unityRegistry],
      false,
      false,
      [somePackument.name]
    );

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
      expect.objectContaining({
        dependencies: { [somePackument.name]: someVersion },
      })
    );
  });

  it("should add scope for package", async () => {
    const { addDependencies, mockFs } = makeDependencies();

    await addDependencies(
      someProjectDir,
      null,
      [someRegistry, unityRegistry],
      false,
      false,
      [somePackument.name]
    );

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
      expect.objectContaining({
        scopedRegistries: [
          {
            name: expect.any(String),
            url: someRegistryUrl,
            scopes: [somePackument.name],
          },
        ],
      })
    );
  });

  it("should add package to testables when running with test option", async () => {
    const { addDependencies, mockFs } = makeDependencies();

    await addDependencies(
      someProjectDir,
      null,
      [someRegistry, unityRegistry],
      false,
      true,
      [somePackument.name]
    );

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
      expect.objectContaining({
        testables: [somePackument.name],
      })
    );
  });

  it("should add package with dependencies in multiple registries", async () => {
    const { addDependencies, mockFs } = makeDependencies();

    await addDependencies(
      someProjectDir,
      null,
      [someRegistry, otherRegistry, unityRegistry],
      false,
      false,
      [anotherPackument.name]
    );

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
      expect.objectContaining({
        dependencies: { [anotherPackument.name]: someVersion },
        scopedRegistries: expect.arrayContaining([
          {
            name: expect.any(String),
            url: otherRegistryUrl,
            scopes: [anotherPackument.name],
          },
          {
            name: expect.any(String),
            url: someRegistryUrl,
            scopes: [somePackument.name],
          },
        ]),
      })
    );
  });

  it("should be atomic", async () => {
    const { addDependencies, mockFs } = makeDependencies();

    await addDependencies(
      someProjectDir,
      null,
      [someRegistry, unityRegistry],
      false,
      true,
      // The second package can not be added
      [somePackument.name, unknownPackage]
    ).catch(() => {});

    // Because adding is atomic the manifest should only be written if
    // all packages were added.
    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(emptyProjectManifest);
  });
});
