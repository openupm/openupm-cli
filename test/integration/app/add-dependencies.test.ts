import RegClient from "another-npm-registry-client";
import nock from "nock";
import {
  addDependenciesUsing,
  CompatibilityCheckFailedError,
  PackageIncompatibleError,
  UnresolvedDependenciesError,
  type AddResult,
} from "../../../src/app/add-dependencies";
import { PackumentNotFoundError } from "../../../src/domain/common-errors";
import { DomainName } from "../../../src/domain/domain-name";
import { makeEditorVersion } from "../../../src/domain/editor-version";
import { partialApply } from "../../../src/domain/fp-utils";
import { noopLogger } from "../../../src/domain/logging";
import { emptyProjectManifest } from "../../../src/domain/project-manifest";
import { unityRegistry } from "../../../src/domain/registry";
import { unityRegistryUrl } from "../../../src/domain/registry-url";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import { getRegistryPackumentUsing } from "../../../src/io/registry";
import { fetchCheckUrlExists } from "../../../src/io/www";
import { buildPackument } from "../../common/data-packument";
import { buildProjectManifest } from "../../common/data-project-manifest";
import { someRegistry, someRegistryUrl } from "../../common/data-registry";
import { makeMockLogger } from "../../common/log.mock";
import { MockFs } from "../fs.mock";
import { mockRegistryPackuments } from "../registry.mock";

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
    const fetchPackument = getRegistryPackumentUsing(
      new RegClient(),
      noopLogger
    );

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
    mockRegistryPackuments(someRegistryUrl, [
      somePackument,
      otherPackument,
      packumentWithBadDependency,
      badEditorPackument,
      incompatiblePackument,
    ]);
    mockRegistryPackuments(unityRegistryUrl, []);
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
            scopes: [otherPackument.name, somePackument.name],
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
