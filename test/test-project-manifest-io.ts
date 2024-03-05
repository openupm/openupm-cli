import { attachMockConsole, MockConsole } from "./mock-console";
import "should";
import {
  loadProjectManifest,
  saveProjectManifest,
} from "../src/utils/project-manifest-io";
import { describe } from "mocha";
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

describe("project-manifest io", function () {
  let mockConsole: MockConsole = null!;
  let mockProject: MockUnityProject = null!;

  before(async function () {
    mockProject = await setupUnityProject({});
  });

  beforeEach(function () {
    mockConsole = attachMockConsole();
  });

  afterEach(async function () {
    await mockProject.reset();
    mockConsole.detach();
  });

  after(async function () {
    await mockProject.restore();
  });

  it("loadManifest", async function () {
    const manifest = await loadProjectManifest(mockProject.projectPath);
    should(manifest).be.deepEqual({ dependencies: {} });
  });
  it("no manifest file", async function () {
    const manifest = await loadProjectManifest("/invalid-path");
    should(manifest).be.null();
    mockConsole.hasLineIncluding("out", "does not exist").should.be.ok();
  });
  it("wrong json content", async function () {
    const manifestPath = manifestPathFor(mockProject.projectPath);
    fse.writeFileSync(manifestPath, "invalid data");

    const manifest = await loadProjectManifest(mockProject.projectPath);
    should(manifest).be.null();
    mockConsole.hasLineIncluding("out", "failed to parse").should.be.ok();
  });
  it("saveManifest", async function () {
    const manifest = (await loadProjectManifest(mockProject.projectPath))!;
    shouldNotHaveAnyDependencies(manifest);
    addDependency(manifest, domainName("some-pack"), semanticVersion("1.0.0"));
    (
      await saveProjectManifest(mockProject.projectPath, manifest)
    ).should.be.ok();
    const manifest2 = await loadProjectManifest(mockProject.projectPath);
    should(manifest2).be.deepEqual(manifest);
  });
  it("manifest-path is correct", function () {
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
