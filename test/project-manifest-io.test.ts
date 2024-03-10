import { attachMockConsole, MockConsole } from "./mock-console";

import {
  loadProjectManifest,
  saveProjectManifest,
} from "../src/utils/project-manifest-io";
import { DomainName, domainName } from "../src/types/domain-name";
import { semanticVersion } from "../src/types/semantic-version";
import {
  addDependency,
  manifestPathFor,
  tryGetScopedRegistryByUrl,
} from "../src/types/project-manifest";
import { MockUnityProject, setupUnityProject } from "./setup/unity-project";
import fse from "fs-extra";
import path from "path";
import { buildProjectManifest } from "./data-project-manifest";
import { removeScope } from "../src/types/scoped-registry";
import { exampleRegistryUrl } from "./mock-registry";

describe("project-manifest io", () => {
  let mockConsole: MockConsole = null!;
  let mockProject: MockUnityProject = null!;

  beforeAll(async () => {
    mockProject = await setupUnityProject({});
  });

  beforeEach(() => {
    mockConsole = attachMockConsole();
  });

  afterEach(async () => {
    await mockProject.reset();
    mockConsole.detach();
  });

  afterAll(async () => {
    await mockProject.restore();
  });

  it("loadManifest", async () => {
    const manifest = await loadProjectManifest(mockProject.projectPath);
    expect(manifest).toEqual({ dependencies: {} });
  });
  it("no manifest file", async () => {
    const manifest = await loadProjectManifest("/invalid-path");
    expect(manifest).toBeNull();
    expect(mockConsole).toHaveLineIncluding("out", "does not exist");
  });
  it("wrong json content", async () => {
    const manifestPath = manifestPathFor(mockProject.projectPath);
    fse.writeFileSync(manifestPath, "invalid data");

    const manifest = await loadProjectManifest(mockProject.projectPath);
    expect(manifest).toBeNull();
    expect(mockConsole).toHaveLineIncluding("out", "failed to parse");
  });
  it("saveManifest", async () => {
    let manifest = (await loadProjectManifest(mockProject.projectPath))!;
    expect(manifest).not.toHaveDependencies();
    manifest = addDependency(
      manifest,
      domainName("some-pack"),
      semanticVersion("1.0.0")
    );
    expect(
      await saveProjectManifest(mockProject.projectPath, manifest)
    ).toBeTruthy();
    const manifest2 = await loadProjectManifest(mockProject.projectPath);
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
    const initialManifest = buildProjectManifest((manifest) =>
      manifest.addScope(testDomain)
    );
    const scopedRegistry = tryGetScopedRegistryByUrl(
      initialManifest,
      exampleRegistryUrl
    )!;
    removeScope(scopedRegistry, testDomain);

    // Save and load manifest
    expect(
      await saveProjectManifest(mockProject.projectPath, initialManifest)
    ).toBeTruthy();
    const savedManifest = await loadProjectManifest(mockProject.projectPath);

    expect(savedManifest?.scopedRegistries).toHaveLength(0);
  });
});
