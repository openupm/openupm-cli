import {
  EditorIncompatibleError,
  InvalidPackumentDataError,
  makeAddCmd,
  UnresolvedDependencyError,
} from "../src/cli/cmd-add";
import { makeDomainName } from "../src/domain/domain-name";
import { Env, ParseEnvService } from "../src/services/parse-env";
import { exampleRegistryUrl } from "./data-registry";
import { unityRegistryUrl } from "../src/domain/registry-url";
import { makeEditorVersion } from "../src/domain/editor-version";
import { Err, Ok } from "ts-results-es";
import { IOError, NotFoundError } from "../src/io/file-io";
import {
  mockProjectManifest,
  spyOnSavedManifest,
} from "./project-manifest-io.mock";
import { emptyProjectManifest } from "../src/domain/project-manifest";
import { spyOnLog } from "./log.mock";
import { buildPackument } from "./data-packument";
import { mockResolvedPackuments } from "./packument-resolving.mock";
import { PackumentNotFoundError } from "../src/common-errors";
import { buildProjectManifest } from "./data-project-manifest";
import { ResolveDependenciesService } from "../src/services/dependency-resolving";
import { makeSemanticVersion } from "../src/domain/semantic-version";
import { VersionNotFoundError } from "../src/packument-resolving";
import { mockService } from "./service.mock";
import { ResolveRemotePackumentService } from "../src/services/resolve-remote-packument";
import { LoadProjectManifest } from "../src/io/project-manifest-io";

const somePackage = makeDomainName("com.some.package");
const otherPackage = makeDomainName("com.other.package");
const somePackument = buildPackument(somePackage, (packument) =>
  packument.addVersion("1.0.0", (version) =>
    version.set("unity", "2022.2").addDependency(otherPackage, "1.0.0")
  )
);
const otherPackument = buildPackument(otherPackage, (packument) =>
  packument.addVersion("1.0.0", (version) => version.set("unity", "2022.2"))
);
const badEditorPackument = buildPackument(somePackage, (packument) =>
  packument.addVersion("1.0.0", (version) =>
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    version.set("unity", "bad value")
  )
);
const incompatiblePackument = buildPackument(somePackage, (packument) =>
  packument.addVersion("1.0.0", (version) => version.set("unity", "2023.1"))
);

const defaultEnv = {
  cwd: "/users/some-user/projects/SomeProject",
  upstream: true,
  registry: { url: exampleRegistryUrl, auth: null },
  upstreamRegistry: { url: unityRegistryUrl, auth: null },
  editorVersion: makeEditorVersion(2022, 2, 1, "f", 2),
} as Env;

function makeDependencies() {
  const parseEnv = mockService<ParseEnvService>();
  parseEnv.mockResolvedValue(Ok(defaultEnv));

  const resolveRemotePackument = mockService<ResolveRemotePackumentService>();
  mockResolvedPackuments(
    resolveRemotePackument,
    [exampleRegistryUrl, somePackument],
    [exampleRegistryUrl, otherPackument]
  );

  const resolveDependencies = mockService<ResolveDependenciesService>();
  resolveDependencies.mockResolvedValue([
    [
      {
        name: somePackage,
        version: makeSemanticVersion("1.0.0"),
        upstream: false,
        internal: false,
        self: true,
      },
      {
        name: otherPackage,
        version: makeSemanticVersion("1.0.0"),
        upstream: false,
        internal: false,
        self: false,
      },
    ],
    [],
  ]);

  const loadProjectManifest = mockService<LoadProjectManifest>();
  mockProjectManifest(loadProjectManifest, emptyProjectManifest);

  const addCmd = makeAddCmd(
    parseEnv,
    resolveRemotePackument,
    resolveDependencies,
    loadProjectManifest
  );
  return {
    addCmd,
    parseEnv,
    resolveRemotePackument,
    resolveDependencies,
    loadProjectManifest,
  } as const;
}

describe("cmd-add", () => {
  beforeEach(() => {
    spyOnSavedManifest();
  });

  it("should fail if env could not be parsed", async () => {
    const expected = new IOError();
    const { addCmd, parseEnv } = makeDependencies();
    parseEnv.mockResolvedValue(Err(expected));

    const result = await addCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should fail if manifest could not be loaded", async () => {
    const { addCmd, loadProjectManifest } = makeDependencies();
    mockProjectManifest(loadProjectManifest, null);

    const result = await addCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) =>
      expect(actual).toBeInstanceOf(NotFoundError)
    );
  });

  it("should notify if manifest could not be loaded", async () => {
    const errorSpy = spyOnLog("error");
    const { addCmd, loadProjectManifest } = makeDependencies();
    mockProjectManifest(loadProjectManifest, null);

    await addCmd(somePackage, { _global: {} });

    expect(errorSpy).toHaveLogLike("manifest", "");
  });

  it("should fail if package could not be resolved", async () => {
    const { addCmd, resolveRemotePackument } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument);

    const result = await addCmd(somePackage, { _global: {} });

    expect(result).toBeError((error) =>
      expect(error).toBeInstanceOf(PackumentNotFoundError)
    );
  });

  it("should notify if package could not be resolved", async () => {
    const errorSpy = spyOnLog("error");
    const { addCmd, resolveRemotePackument } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument);

    await addCmd(somePackage, { _global: {} });

    expect(errorSpy).toHaveLogLike("404", "not found");
  });

  /*
  ---
  TODO: Fix these tests
  For these tests to work, logic in add-cmd needs to be changed.
  The tests expects that in the scenario
    - Primary registry: Has package, but not correct version
    - Upstream registry: Does not have the package
  it should fail because the version was not found.
  
  Currently it will still fail with "package not found" because the error
  of the package missing in the upstream overrides the first error.
  ---
      
  it("should fail if package version could not be resolved", async () => {
    const {addCmd} = makeDependencies();

    const result = await addCmd(makePackageReference(somePackage, "2.0.0"), {
      _global: {},
    });

    expect(result).toBeError((error) =>
      expect(error).toBeInstanceOf(VersionNotFoundError)
    );
  });

  it("should notify if package version could not be resolved", async () => {
    const warnSpy = spyOnLog("warn");
    const {addCmd} = makeDependencies();

    await addCmd(makePackageReference(somePackage, "2.0.0"), {
      _global: {},
    });

    expect(warnSpy).toHaveLogLike("404", "is not a valid choice");
  });
  */

  it("should notify if editor-version is unknown", async () => {
    const warnSpy = spyOnLog("warn");
    const { addCmd, parseEnv } = makeDependencies();
    parseEnv.mockResolvedValue(
      Ok({ ...defaultEnv, editorVersion: "bad version" })
    );

    await addCmd(somePackage, {
      _global: {},
    });

    expect(warnSpy).toHaveLogLike("editor.version", "unknown");
  });

  it("should notify if package editor version is not valid", async () => {
    const warnSpy = spyOnLog("warn");
    const { addCmd, resolveRemotePackument } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      exampleRegistryUrl,
      badEditorPackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(warnSpy).toHaveLogLike("package.unity", "not valid");
  });

  it("should suggest running with force if package editor version is not valid", async () => {
    const noticeSpy = spyOnLog("notice");
    const { addCmd, resolveRemotePackument } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      exampleRegistryUrl,
      badEditorPackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(noticeSpy).toHaveLogLike("suggest", "run with option -f");
  });

  it("should fail if package editor version is not valid and not running with force", async () => {
    const { addCmd, resolveRemotePackument } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      exampleRegistryUrl,
      badEditorPackument,
    ]);

    const result = await addCmd(somePackage, {
      _global: {},
    });

    expect(result).toBeError((error) =>
      expect(error).toBeInstanceOf(InvalidPackumentDataError)
    );
  });

  it("should add package with invalid editor version when running with force", async () => {
    const { addCmd, resolveRemotePackument } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      exampleRegistryUrl,
      badEditorPackument,
    ]);

    const result = await addCmd(somePackage, {
      _global: {},
      force: true,
    });

    expect(result).toBeOk();
  });

  it("should notify if package is incompatible with editor", async () => {
    const warnSpy = spyOnLog("warn");
    const { addCmd, resolveRemotePackument } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      exampleRegistryUrl,
      incompatiblePackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(warnSpy).toHaveLogLike("editor.version", "requires");
  });

  it("should suggest to run with force if package is incompatible with editor", async () => {
    const noticeSpy = spyOnLog("notice");
    const { addCmd, resolveRemotePackument } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      exampleRegistryUrl,
      incompatiblePackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(noticeSpy).toHaveLogLike("suggest", "run with option -f");
  });

  it("should fail if package is incompatible with editor and not running with force", async () => {
    const { addCmd, resolveRemotePackument } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      exampleRegistryUrl,
      incompatiblePackument,
    ]);

    const result = await addCmd(somePackage, {
      _global: {},
    });

    expect(result).toBeError((error) =>
      expect(error).toBeInstanceOf(EditorIncompatibleError)
    );
  });

  it("should add package with incompatible with editor when running with force", async () => {
    const { addCmd, resolveRemotePackument } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      exampleRegistryUrl,
      incompatiblePackument,
    ]);

    const result = await addCmd(somePackage, {
      _global: {},
      force: true,
    });

    expect(result).toBeOk();
  });

  it("should notify of fetching dependencies", async () => {
    const verboseSpy = spyOnLog("verbose");
    const { addCmd } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
    });

    expect(verboseSpy).toHaveLogLike("dependency", "fetch");
  });

  it("should not fetch dependencies for upstream packages", async () => {
    const verboseSpy = spyOnLog("verbose");
    const { addCmd, resolveRemotePackument } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      unityRegistryUrl,
      somePackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(verboseSpy).not.toHaveLogLike("dependency", "fetch");
  });

  it("should suggest to install missing dependency version manually", async () => {
    const noticeSpy = spyOnLog("notice");
    const { addCmd, resolveDependencies } = makeDependencies();
    resolveDependencies.mockResolvedValue([
      [],
      [
        {
          name: otherPackage,
          self: false,
          reason: new VersionNotFoundError(makeSemanticVersion("1.0.0"), []),
        },
      ],
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(noticeSpy).toHaveLogLike("suggest", "manually");
  });

  it("should suggest to run with force if dependency could not be resolved", async () => {
    const errorSpy = spyOnLog("error");
    const { addCmd, resolveDependencies } = makeDependencies();
    resolveDependencies.mockResolvedValue([
      [],
      [
        {
          name: otherPackage,
          self: false,
          reason: new VersionNotFoundError(makeSemanticVersion("1.0.0"), []),
        },
      ],
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(errorSpy).toHaveLogLike(
      "missing dependencies",
      "run with option -f"
    );
  });

  it("should fail if dependency could not be resolved and not running with force", async () => {
    const { addCmd, resolveDependencies } = makeDependencies();
    resolveDependencies.mockResolvedValue([
      [],
      [
        {
          name: otherPackage,
          self: false,
          reason: new VersionNotFoundError(makeSemanticVersion("1.0.0"), []),
        },
      ],
    ]);

    const result = await addCmd(somePackage, {
      _global: {},
    });

    expect(result).toBeError((error) =>
      expect(error).toBeInstanceOf(UnresolvedDependencyError)
    );
  });

  it("should add package with unresolved dependency when running with force", async () => {
    const { addCmd, resolveDependencies } = makeDependencies();
    resolveDependencies.mockResolvedValue([
      [],
      [
        {
          name: otherPackage,
          self: false,
          reason: new VersionNotFoundError(makeSemanticVersion("1.0.0"), []),
        },
      ],
    ]);

    const result = await addCmd(somePackage, {
      _global: {},
      force: true,
    });

    expect(result).toBeOk();
  });

  it("should add package", async () => {
    const saveSpy = spyOnSavedManifest();
    const { addCmd } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
    });

    expect(saveSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        dependencies: { [somePackage]: "1.0.0" },
      })
    );
  });

  it("should notify if package was added", async () => {
    const noticeSpy = spyOnLog("notice");
    const { addCmd } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
    });

    expect(noticeSpy).toHaveLogLike("manifest", "added");
  });

  it("should replace package", async () => {
    const saveSpy = spyOnSavedManifest();
    const { addCmd, loadProjectManifest } = makeDependencies();
    mockProjectManifest(
      loadProjectManifest,
      buildProjectManifest((manifest) =>
        manifest.addDependency(somePackage, "0.1.0", true, true)
      )
    );

    await addCmd(somePackage, {
      _global: {},
    });

    expect(saveSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        dependencies: { [somePackage]: "1.0.0" },
      })
    );
  });

  it("should notify if package was replaced", async () => {
    const noticeSpy = spyOnLog("notice");
    const { addCmd, loadProjectManifest } = makeDependencies();
    mockProjectManifest(
      loadProjectManifest,
      buildProjectManifest((manifest) =>
        manifest.addDependency(somePackage, "0.1.0", true, true)
      )
    );

    await addCmd(somePackage, {
      _global: {},
    });

    expect(noticeSpy).toHaveLogLike("manifest", "modified");
  });

  it("should notify if package is already in manifest", async () => {
    const noticeSpy = spyOnLog("notice");
    const { addCmd, loadProjectManifest } = makeDependencies();
    mockProjectManifest(
      loadProjectManifest,
      buildProjectManifest((manifest) =>
        manifest.addDependency(somePackage, "1.0.0", true, true)
      )
    );

    await addCmd(somePackage, {
      _global: {},
    });

    expect(noticeSpy).toHaveLogLike("manifest", "existed");
  });

  it("should add scope for package", async () => {
    const saveSpy = spyOnSavedManifest();
    const { addCmd } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
    });

    expect(saveSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        scopedRegistries: [
          {
            name: "example.com",
            url: exampleRegistryUrl,
            scopes: [otherPackage, somePackage],
          },
        ],
      })
    );
  });

  it("should add package to testables when running with test option", async () => {
    const saveSpy = spyOnSavedManifest();
    const { addCmd } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
      test: true,
    });

    expect(saveSpy).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        testables: [somePackage],
      })
    );
  });

  it("should not save if nothing changed", async () => {
    const saveSpy = spyOnSavedManifest();
    const { addCmd, loadProjectManifest } = makeDependencies();
    mockProjectManifest(
      loadProjectManifest,
      buildProjectManifest((manifest) =>
        manifest
          .addDependency(somePackage, "1.0.0", true, false)
          .addScope(otherPackage)
      )
    );

    await addCmd(somePackage, {
      _global: {},
    });

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("should be atomic", async () => {
    const saveSpy = spyOnSavedManifest();
    const { addCmd } = makeDependencies();

    // The second package can not be added
    await addCmd([somePackage, makeDomainName("com.unknown.package")], {
      _global: {},
    });

    // Because adding is atomic the manifest should only be written if
    // all packages were added.
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("should suggest to open Unity after save", async () => {
    const noticeSpy = spyOnLog("notice");
    const { addCmd } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
    });

    expect(noticeSpy).toHaveLogLike("", "open Unity");
  });

  it("should fail if manifest could not be saved", async () => {
    const expected = new IOError();
    spyOnSavedManifest().mockReturnValue(Err(expected).toAsyncResult());
    const { addCmd } = makeDependencies();

    const result = await addCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should notify if manifest could not be saved", async () => {
    const errorSpy = spyOnLog("error");
    spyOnSavedManifest().mockReturnValue(Err(new IOError()).toAsyncResult());
    const { addCmd } = makeDependencies();

    await addCmd(somePackage, { _global: {} });

    expect(errorSpy).toHaveLogLike("manifest", "");
  });
});
