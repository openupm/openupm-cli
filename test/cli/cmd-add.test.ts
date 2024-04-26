import {
  EditorIncompatibleError,
  InvalidPackumentDataError,
  makeAddCmd,
  UnresolvedDependencyError,
} from "../../src/cli/cmd-add";
import { makeDomainName } from "../../src/domain/domain-name";
import { Env, ParseEnvService } from "../../src/services/parse-env";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";
import { makeEditorVersion } from "../../src/domain/editor-version";
import { Err, Ok } from "ts-results-es";
import { IOError, NotFoundError } from "../../src/io/file-io";
import {
  mockProjectManifest,
  mockProjectManifestWriteResult,
} from "../io/project-manifest-io.mock";
import { emptyProjectManifest } from "../../src/domain/project-manifest";
import { makeMockLogger } from "./log.mock";
import { buildPackument } from "../domain/data-packument";
import { mockResolvedPackuments } from "../services/packument-resolving.mock";
import { PackumentNotFoundError } from "../../src/common-errors";
import { buildProjectManifest } from "../domain/data-project-manifest";
import { ResolveDependenciesService } from "../../src/services/dependency-resolving";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { VersionNotFoundError } from "../../src/packument-resolving";
import { mockService } from "../services/service.mock";
import { ResolveRemotePackumentService } from "../../src/services/resolve-remote-packument";
import {
  LoadProjectManifest,
  WriteProjectManifest,
} from "../../src/io/project-manifest-io";
import { makePackageReference } from "../../src/domain/package-reference";

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
        source: exampleRegistryUrl,
        internal: false,
        self: true,
      },
      {
        name: otherPackage,
        version: makeSemanticVersion("1.0.0"),
        source: exampleRegistryUrl,
        internal: false,
        self: false,
      },
    ],
    [],
  ]);

  const loadProjectManifest = mockService<LoadProjectManifest>();
  mockProjectManifest(loadProjectManifest, emptyProjectManifest);

  const writeProjectManifest = mockService<WriteProjectManifest>();
  mockProjectManifestWriteResult(writeProjectManifest);

  const log = makeMockLogger();

  const addCmd = makeAddCmd(
    parseEnv,
    resolveRemotePackument,
    resolveDependencies,
    loadProjectManifest,
    writeProjectManifest,
    log
  );
  return {
    addCmd,
    parseEnv,
    resolveRemotePackument,
    resolveDependencies,
    loadProjectManifest,
    writeProjectManifest,
    log,
  } as const;
}

describe("cmd-add", () => {
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
    const { addCmd, loadProjectManifest, log } = makeDependencies();
    mockProjectManifest(loadProjectManifest, null);

    await addCmd(somePackage, { _global: {} });

    expect(log.error).toHaveLogLike("manifest", expect.any(String));
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
    const { addCmd, resolveRemotePackument, log } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument);

    await addCmd(somePackage, { _global: {} });

    expect(log.error).toHaveLogLike(
      "404",
      expect.stringContaining("not found")
    );
  });

  it("should fail if package version could not be resolved", async () => {
    const { addCmd } = makeDependencies();

    const result = await addCmd(makePackageReference(somePackage, "2.0.0"), {
      _global: {},
    });

    expect(result).toBeError((error) =>
      expect(error).toBeInstanceOf(VersionNotFoundError)
    );
  });

  it("should notify if package version could not be resolved", async () => {
    const { addCmd, log } = makeDependencies();

    await addCmd(makePackageReference(somePackage, "2.0.0"), {
      _global: {},
    });

    expect(log.warn).toHaveLogLike(
      "404",
      expect.stringContaining("is not a valid choice")
    );
  });

  it("should notify if editor-version is unknown", async () => {
    const { addCmd, parseEnv, log } = makeDependencies();
    parseEnv.mockResolvedValue(
      Ok({ ...defaultEnv, editorVersion: "bad version" })
    );

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.warn).toHaveLogLike(
      "editor.version",
      expect.stringContaining("unknown")
    );
  });

  it("should notify if package editor version is not valid", async () => {
    const { addCmd, resolveRemotePackument, log } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      exampleRegistryUrl,
      badEditorPackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.warn).toHaveLogLike(
      "package.unity",
      expect.stringContaining("not valid")
    );
  });

  it("should suggest running with force if package editor version is not valid", async () => {
    const { addCmd, resolveRemotePackument, log } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      exampleRegistryUrl,
      badEditorPackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.notice).toHaveLogLike(
      "suggest",
      expect.stringContaining("run with option -f")
    );
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
    const { addCmd, resolveRemotePackument, log } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      exampleRegistryUrl,
      incompatiblePackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.warn).toHaveLogLike(
      "editor.version",
      expect.stringContaining("requires")
    );
  });

  it("should suggest to run with force if package is incompatible with editor", async () => {
    const { addCmd, resolveRemotePackument, log } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      exampleRegistryUrl,
      incompatiblePackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.notice).toHaveLogLike(
      "suggest",
      expect.stringContaining("run with option -f")
    );
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
    const { addCmd, log } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.verbose).toHaveLogLike(
      "dependency",
      expect.stringContaining("fetch")
    );
  });

  it("should notify of unresolved dependencies", async () => {
    const { addCmd, resolveDependencies, log } = makeDependencies();
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

    expect(log.warn).toHaveLogLike(
      "404",
      expect.stringContaining("is not a valid choice")
    );
  });

  it("should not fetch dependencies for upstream packages", async () => {
    const { addCmd, resolveRemotePackument, log } = makeDependencies();
    mockResolvedPackuments(resolveRemotePackument, [
      unityRegistryUrl,
      somePackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.verbose).not.toHaveLogLike(
      "dependency",
      expect.stringContaining("fetch")
    );
  });

  it("should suggest to install missing dependency version manually", async () => {
    const { addCmd, resolveDependencies, log } = makeDependencies();
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

    expect(log.notice).toHaveLogLike(
      "suggest",
      expect.stringContaining("manually")
    );
  });

  it("should suggest to run with force if dependency could not be resolved", async () => {
    const { addCmd, resolveDependencies, log } = makeDependencies();
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

    expect(log.error).toHaveLogLike(
      "missing dependencies",
      expect.stringContaining("run with option -f")
    );
  });

  it("should print verbose information about valid dependencies", async () => {
    const { addCmd, log } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.verbose).toHaveLogLike(
      "dependency",
      expect.stringContaining(somePackage)
    );
    expect(log.verbose).toHaveLogLike(
      "dependency",
      expect.stringContaining(otherPackage)
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
    const { addCmd, writeProjectManifest } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
    });

    expect(writeProjectManifest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        dependencies: { [somePackage]: "1.0.0" },
      })
    );
  });

  it("should notify if package was added", async () => {
    const { addCmd, log } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.notice).toHaveLogLike(
      "manifest",
      expect.stringContaining("added")
    );
  });

  it("should replace package", async () => {
    const { addCmd, writeProjectManifest, loadProjectManifest } =
      makeDependencies();
    mockProjectManifest(
      loadProjectManifest,
      buildProjectManifest((manifest) =>
        manifest.addDependency(somePackage, "0.1.0", true, true)
      )
    );

    await addCmd(somePackage, {
      _global: {},
    });

    expect(writeProjectManifest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        dependencies: { [somePackage]: "1.0.0" },
      })
    );
  });

  it("should notify if package was replaced", async () => {
    const { addCmd, loadProjectManifest, log } = makeDependencies();
    mockProjectManifest(
      loadProjectManifest,
      buildProjectManifest((manifest) =>
        manifest.addDependency(somePackage, "0.1.0", true, true)
      )
    );

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.notice).toHaveLogLike(
      "manifest",
      expect.stringContaining("modified")
    );
  });

  it("should notify if package is already in manifest", async () => {
    const { addCmd, loadProjectManifest, log } = makeDependencies();
    mockProjectManifest(
      loadProjectManifest,
      buildProjectManifest((manifest) =>
        manifest.addDependency(somePackage, "1.0.0", true, true)
      )
    );

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.notice).toHaveLogLike(
      "manifest",
      expect.stringContaining("existed")
    );
  });

  it("should add scope for package", async () => {
    const { addCmd, writeProjectManifest } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
    });

    expect(writeProjectManifest).toHaveBeenCalledWith(
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
    const { addCmd, writeProjectManifest } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
      test: true,
    });

    expect(writeProjectManifest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        testables: [somePackage],
      })
    );
  });

  it("should not save if nothing changed", async () => {
    const { addCmd, loadProjectManifest, writeProjectManifest } =
      makeDependencies();
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

    expect(writeProjectManifest).not.toHaveBeenCalled();
  });

  it("should be atomic", async () => {
    const { addCmd, writeProjectManifest } = makeDependencies();

    // The second package can not be added
    await addCmd([somePackage, makeDomainName("com.unknown.package")], {
      _global: {},
    });

    // Because adding is atomic the manifest should only be written if
    // all packages were added.
    expect(writeProjectManifest).not.toHaveBeenCalled();
  });

  it("should suggest to open Unity after save", async () => {
    const { addCmd, log } = makeDependencies();

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.notice).toHaveLogLike("", expect.stringContaining("open Unity"));
  });

  it("should fail if manifest could not be saved", async () => {
    const expected = new IOError();
    const { addCmd, writeProjectManifest } = makeDependencies();
    mockProjectManifestWriteResult(writeProjectManifest, expected);

    const result = await addCmd(somePackage, { _global: {} });

    expect(result).toBeError((actual) => expect(actual).toEqual(expected));
  });

  it("should notify if manifest could not be saved", async () => {
    const { addCmd, writeProjectManifest, log } = makeDependencies();
    mockProjectManifestWriteResult(writeProjectManifest, new IOError());

    await addCmd(somePackage, { _global: {} });

    expect(log.error).toHaveLogLike("manifest", expect.stringContaining(""));
  });
});
