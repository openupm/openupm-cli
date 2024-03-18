import {
  manifestPathFor,
  tryLoadProjectManifest,
  trySaveProjectManifest,
} from "../src/utils/project-manifest-io";
import { DomainName, makeDomainName } from "../src/types/domain-name";
import { makeSemanticVersion } from "../src/types/semantic-version";
import {
  addDependency,
  mapScopedRegistry,
} from "../src/types/project-manifest";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";
import fse from "fs-extra";
import path from "path";
import { buildProjectManifest } from "./data-project-manifest";
import { removeScope } from "../src/types/scoped-registry";
import { exampleRegistryUrl } from "./mock-registry";
import {
  FileParseError,
  RequiredFileNotFoundError,
} from "../src/common-errors";

describe("project-manifest io", () => {
  let mockProject: MockUnityProject = null!;

  beforeAll(async () => {
    mockProject = await setupUnityProject({});
  });

  afterEach(async () => {
    await mockProject.reset();
  });

  afterAll(async () => {
    await mockProject.restore();
  });

  it("loadManifest", async () => {
    const manifestResult = await tryLoadProjectManifest(mockProject.projectPath)
      .promise;

    expect(manifestResult).toBeOk((manifest) =>
      expect(manifest).toEqual({ dependencies: {} })
    );
  });
  it("no manifest file", async () => {
    const manifestResult = await tryLoadProjectManifest("/invalid-path")
      .promise;

    expect(manifestResult).toBeError((error) =>
      expect(error).toBeInstanceOf(RequiredFileNotFoundError)
    );
  });
  it("wrong json content", async () => {
    const manifestPath = manifestPathFor(mockProject.projectPath);
    fse.writeFileSync(manifestPath, "invalid data");

    const manifestResult = await tryLoadProjectManifest(mockProject.projectPath)
      .promise;
    expect(manifestResult).toBeError((error) =>
      expect(error).toBeInstanceOf(FileParseError)
    );
  });
  it("saveManifest", async () => {
    let manifest = (
      await tryLoadProjectManifest(mockProject.projectPath).promise
    ).unwrap();
    expect(manifest).not.toHaveDependencies();
    manifest = addDependency(
      manifest,
      makeDomainName("some-pack"),
      makeSemanticVersion("1.0.0")
    );
    expect(
      await trySaveProjectManifest(mockProject.projectPath, manifest).promise
    ).toBeOk();
    const manifest2 = (
      await tryLoadProjectManifest(mockProject.projectPath).promise
    ).unwrap();
    expect(manifest2).toEqual(manifest);
  });
  it("manifest-path is correct", () => {
    const manifestPath = manifestPathFor("test-openupm-cli");
    const expected = path.join("test-openupm-cli", "Packages", "manifest.json");
    expect(manifestPath).toEqual(expected);
  });
  it("should not save scoped-registry with empty scopes", async () => {
    // Add and then remove a scope to force an empty scoped-registry
    const testDomain = "test" as DomainName;
    let initialManifest = buildProjectManifest((manifest) =>
      manifest.addScope(testDomain)
    );
    initialManifest = mapScopedRegistry(
      initialManifest,
      exampleRegistryUrl,
      (registry) => {
        return removeScope(registry!, testDomain);
      }
    );

    // Save and load manifest
    expect(
      await trySaveProjectManifest(mockProject.projectPath, initialManifest)
        .promise
    ).toBeOk();
    const savedManifest = (
      await tryLoadProjectManifest(mockProject.projectPath).promise
    ).unwrap();

    expect(savedManifest.scopedRegistries).toHaveLength(0);
  });
});
