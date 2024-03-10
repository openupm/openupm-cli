import { attachMockConsole, MockConsole } from "./mock-console";
import "should";
import {
  loadProjectManifest,
  saveProjectManifest,
} from "../src/utils/project-manifest-io";
import { shouldNotHaveAnyDependencies } from "./project-manifest-assertions";
import { DomainName, domainName } from "../src/types/domain-name";
import { semanticVersion } from "../src/types/semantic-version";
import {
  addDependency,
  manifestPathFor,
  tryGetScopedRegistryByUrl,
} from "../src/types/project-manifest";
import should from "should";
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
    should(manifest).be.deepEqual({ dependencies: {} });
  });
  it("no manifest file", async () => {
    const manifest = await loadProjectManifest("/invalid-path");
    should(manifest).be.null();
    expect(mockConsole).toHaveLineIncluding("out", "does not exist");
  });
  it("wrong json content", async () => {
    const manifestPath = manifestPathFor(mockProject.projectPath);
    fse.writeFileSync(manifestPath, "invalid data");

    const manifest = await loadProjectManifest(mockProject.projectPath);
    should(manifest).be.null();
    expect(mockConsole).toHaveLineIncluding("out", "failed to parse");
  });
  it("saveManifest", async () => {
    let manifest = (await loadProjectManifest(mockProject.projectPath))!;
    shouldNotHaveAnyDependencies(manifest);
    manifest = addDependency(
      manifest,
      domainName("some-pack"),
      semanticVersion("1.0.0")
    );
    (
      await saveProjectManifest(mockProject.projectPath, manifest)
    ).should.be.ok();
    const manifest2 = await loadProjectManifest(mockProject.projectPath);
    should(manifest2).be.deepEqual(manifest);
  });
  it("manifest-path is correct", () => {
    const manifestPath = manifestPathFor("test-openupm-cli");
    const expected = path.join("test-openupm-cli", "Packages", "manifest.json");
    should(manifestPath).be.equal(expected);
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
    (
      await saveProjectManifest(mockProject.projectPath, initialManifest)
    ).should.be.ok();
    const savedManifest = await loadProjectManifest(mockProject.projectPath);

    should(savedManifest?.scopedRegistries).be.empty();
  });
});
