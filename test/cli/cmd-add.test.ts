import {
  InvalidPackumentDataError,
  makeAddCmd,
  UnresolvedDependencyError,
} from "../../src/cli/cmd-add";
import { makeDomainName } from "../../src/domain/domain-name";
import { Env, ParseEnv } from "../../src/services/parse-env";
import { exampleRegistryUrl } from "../domain/data-registry";
import { unityRegistryUrl } from "../../src/domain/registry-url";
import { makeEditorVersion } from "../../src/domain/editor-version";
import { emptyProjectManifest } from "../../src/domain/project-manifest";
import { makeMockLogger } from "./log.mock";
import { buildPackument } from "../domain/data-packument";
import { mockResolvedPackuments } from "../services/packument-resolving.mock";
import { buildProjectManifest } from "../domain/data-project-manifest";
import { ResolveDependencies } from "../../src/services/dependency-resolving";
import { makeSemanticVersion } from "../../src/domain/semantic-version";
import { mockService } from "../services/service.mock";
import { ResolveRemotePackumentVersion } from "../../src/services/resolve-remote-packument-version";
import {
  LoadProjectManifest,
  WriteProjectManifest,
} from "../../src/io/project-manifest-io";
import { makePackageReference } from "../../src/domain/package-reference";
import { VersionNotFoundError } from "../../src/domain/packument";
import { noopLogger } from "../../src/logging";
import { DetermineEditorVersion } from "../../src/services/determine-editor-version";
import { Ok } from "ts-results-es";
import { ResultCodes } from "../../src/cli/result-codes";

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
} as Env;

function makeDependencies() {
  const parseEnv = mockService<ParseEnv>();
  parseEnv.mockResolvedValue(defaultEnv);

  const resolveRemovePackumentVersion =
    mockService<ResolveRemotePackumentVersion>();
  mockResolvedPackuments(
    resolveRemovePackumentVersion,
    [exampleRegistryUrl, somePackument],
    [exampleRegistryUrl, otherPackument]
  );

  const resolveDependencies = mockService<ResolveDependencies>();
  resolveDependencies.mockResolvedValue(
    Ok([
      [
        {
          name: somePackage,
          version: makeSemanticVersion("1.0.0"),
          source: exampleRegistryUrl,
          self: true,
        },
        {
          name: otherPackage,
          version: makeSemanticVersion("1.0.0"),
          source: exampleRegistryUrl,
          self: false,
        },
      ],
      [],
    ])
  );

  const loadProjectManifest = mockService<LoadProjectManifest>();
  loadProjectManifest.mockResolvedValue(emptyProjectManifest);

  const writeProjectManifest = mockService<WriteProjectManifest>();
  writeProjectManifest.mockResolvedValue(undefined);

  const determineEditorVersion = mockService<DetermineEditorVersion>();
  determineEditorVersion.mockResolvedValue(
    makeEditorVersion(2022, 2, 1, "f", 2)
  );

  const log = makeMockLogger();

  const addCmd = makeAddCmd(
    parseEnv,
    resolveRemovePackumentVersion,
    resolveDependencies,
    loadProjectManifest,
    writeProjectManifest,
    determineEditorVersion,
    log,
    noopLogger
  );
  return {
    addCmd,
    parseEnv,
    resolveRemovePackumentVersion,
    resolveDependencies,
    loadProjectManifest,
    writeProjectManifest,
    determineEditorVersion,
    log,
  } as const;
}

describe("cmd-add", () => {
  it("should fail if package could not be resolved", async () => {
    const { addCmd, resolveRemovePackumentVersion } = makeDependencies();
    mockResolvedPackuments(resolveRemovePackumentVersion);

    const resultCode = await addCmd(somePackage, { _global: {} });

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should notify if package could not be resolved", async () => {
    const { addCmd, resolveRemovePackumentVersion, log } = makeDependencies();
    mockResolvedPackuments(resolveRemovePackumentVersion);

    await addCmd(somePackage, { _global: {} });

    expect(log.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("not found")
    );
  });

  it("should fail if package version could not be resolved", async () => {
    const { addCmd } = makeDependencies();

    const resultCode = await addCmd(
      makePackageReference(somePackage, "2.0.0"),
      {
        _global: {},
      }
    );

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should notify if package version could not be resolved", async () => {
    const { addCmd, log } = makeDependencies();

    await addCmd(makePackageReference(somePackage, "2.0.0"), {
      _global: {},
    });

    expect(log.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("has no published version")
    );
  });

  it("should notify if editor-version is unknown", async () => {
    const { addCmd, determineEditorVersion, log } = makeDependencies();
    determineEditorVersion.mockResolvedValue("bad version");

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.warn).toHaveBeenCalledWith(
      "editor.version",
      expect.stringContaining("unknown")
    );
  });

  it("should notify if package editor version is not valid", async () => {
    const { addCmd, resolveRemovePackumentVersion, log } = makeDependencies();
    mockResolvedPackuments(resolveRemovePackumentVersion, [
      exampleRegistryUrl,
      badEditorPackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    }).catch(() => {});

    expect(log.warn).toHaveBeenCalledWith(
      "package.unity",
      expect.stringContaining("not valid")
    );
  });

  it("should suggest running with force if package editor version is not valid", async () => {
    const { addCmd, resolveRemovePackumentVersion, log } = makeDependencies();
    mockResolvedPackuments(resolveRemovePackumentVersion, [
      exampleRegistryUrl,
      badEditorPackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    }).catch(() => {});

    expect(log.notice).toHaveBeenCalledWith(
      "suggest",
      expect.stringContaining("run with option -f")
    );
  });

  it("should fail if package editor version is not valid and not running with force", async () => {
    const { addCmd, resolveRemovePackumentVersion } = makeDependencies();
    mockResolvedPackuments(resolveRemovePackumentVersion, [
      exampleRegistryUrl,
      badEditorPackument,
    ]);

    await expect(() =>
      addCmd(somePackage, {
        _global: {},
      })
    ).rejects.toBeInstanceOf(InvalidPackumentDataError);
  });

  it("should add package with invalid editor version when running with force", async () => {
    const { addCmd, resolveRemovePackumentVersion } = makeDependencies();
    mockResolvedPackuments(resolveRemovePackumentVersion, [
      exampleRegistryUrl,
      badEditorPackument,
    ]);

    const resultCode = await addCmd(somePackage, {
      _global: {},
      force: true,
    });

    expect(resultCode).toEqual(ResultCodes.Ok);
  });

  it("should notify if package is incompatible with editor", async () => {
    const { addCmd, resolveRemovePackumentVersion, log } = makeDependencies();
    mockResolvedPackuments(resolveRemovePackumentVersion, [
      exampleRegistryUrl,
      incompatiblePackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.warn).toHaveBeenCalledWith(
      "editor.version",
      expect.stringContaining("requires")
    );
  });

  it("should suggest to run with force if package is incompatible with editor", async () => {
    const { addCmd, resolveRemovePackumentVersion, log } = makeDependencies();
    mockResolvedPackuments(resolveRemovePackumentVersion, [
      exampleRegistryUrl,
      incompatiblePackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.notice).toHaveBeenCalledWith(
      "suggest",
      expect.stringContaining("run with option -f")
    );
  });

  it("should fail if package is incompatible with editor and not running with force", async () => {
    const { addCmd, resolveRemovePackumentVersion } = makeDependencies();
    mockResolvedPackuments(resolveRemovePackumentVersion, [
      exampleRegistryUrl,
      incompatiblePackument,
    ]);

    const resultCode = await addCmd(somePackage, {
      _global: {},
    });

    expect(resultCode).toEqual(ResultCodes.Error);
  });

  it("should add package with incompatible with editor when running with force", async () => {
    const { addCmd, resolveRemovePackumentVersion } = makeDependencies();
    mockResolvedPackuments(resolveRemovePackumentVersion, [
      exampleRegistryUrl,
      incompatiblePackument,
    ]);

    const resultCode = await addCmd(somePackage, {
      _global: {},
      force: true,
    });

    expect(resultCode).toEqual(ResultCodes.Ok);
  });

  it("should notify of unresolved dependencies", async () => {
    const { addCmd, resolveDependencies, log } = makeDependencies();
    resolveDependencies.mockResolvedValue(
      Ok([
        [],
        [
          {
            name: otherPackage,
            self: false,
            reason: new VersionNotFoundError(makeSemanticVersion("1.0.0"), []),
          },
        ],
      ])
    );

    await addCmd(somePackage, {
      _global: {},
    }).catch(() => {});

    expect(log.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.stringContaining("has no published version")
    );
  });

  it("should not fetch dependencies for upstream packages", async () => {
    const { addCmd, resolveRemovePackumentVersion, resolveDependencies } =
      makeDependencies();
    mockResolvedPackuments(resolveRemovePackumentVersion, [
      unityRegistryUrl,
      somePackument,
    ]);

    await addCmd(somePackage, {
      _global: {},
    });

    expect(resolveDependencies).not.toHaveBeenCalled();
  });

  it("should suggest to install missing dependency version manually", async () => {
    const { addCmd, resolveDependencies, log } = makeDependencies();
    resolveDependencies.mockResolvedValue(
      Ok([
        [],
        [
          {
            name: otherPackage,
            self: false,
            reason: new VersionNotFoundError(makeSemanticVersion("1.0.0"), []),
          },
        ],
      ])
    );

    await addCmd(somePackage, {
      _global: {},
    }).catch(() => {});

    expect(log.notice).toHaveBeenCalledWith(
      "suggest",
      expect.stringContaining("manually")
    );
  });

  it("should suggest to run with force if dependency could not be resolved", async () => {
    const { addCmd, resolveDependencies, log } = makeDependencies();
    resolveDependencies.mockResolvedValue(
      Ok([
        [],
        [
          {
            name: otherPackage,
            self: false,
            reason: new VersionNotFoundError(makeSemanticVersion("1.0.0"), []),
          },
        ],
      ])
    );

    await addCmd(somePackage, {
      _global: {},
    }).catch(() => {});

    expect(log.error).toHaveBeenCalledWith(
      "missing dependencies",
      expect.stringContaining("run with option -f")
    );
  });

  it("should fail if dependency could not be resolved and not running with force", async () => {
    const { addCmd, resolveDependencies } = makeDependencies();
    resolveDependencies.mockResolvedValue(
      Ok([
        [],
        [
          {
            name: otherPackage,
            self: false,
            reason: new VersionNotFoundError(makeSemanticVersion("1.0.0"), []),
          },
        ],
      ])
    );

    await expect(() =>
      addCmd(somePackage, {
        _global: {},
      })
    ).rejects.toBeInstanceOf(UnresolvedDependencyError);
  });

  it("should add package with unresolved dependency when running with force", async () => {
    const { addCmd, resolveDependencies } = makeDependencies();
    resolveDependencies.mockResolvedValue(
      Ok([
        [],
        [
          {
            name: otherPackage,
            self: false,
            reason: new VersionNotFoundError(makeSemanticVersion("1.0.0"), []),
          },
        ],
      ])
    );

    const resultCode = await addCmd(somePackage, {
      _global: {},
      force: true,
    });

    expect(resultCode).toEqual(ResultCodes.Ok);
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

    expect(log.notice).toHaveBeenCalledWith(
      "manifest",
      expect.stringContaining("added")
    );
  });

  it("should replace package", async () => {
    const { addCmd, writeProjectManifest, loadProjectManifest } =
      makeDependencies();
    loadProjectManifest.mockResolvedValue(
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
    loadProjectManifest.mockResolvedValue(
      buildProjectManifest((manifest) =>
        manifest.addDependency(somePackage, "0.1.0", true, true)
      )
    );

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.notice).toHaveBeenCalledWith(
      "manifest",
      expect.stringContaining("modified")
    );
  });

  it("should notify if package is already in manifest", async () => {
    const { addCmd, loadProjectManifest, log } = makeDependencies();
    loadProjectManifest.mockResolvedValue(
      buildProjectManifest((manifest) =>
        manifest.addDependency(somePackage, "1.0.0", true, true)
      )
    );

    await addCmd(somePackage, {
      _global: {},
    });

    expect(log.notice).toHaveBeenCalledWith(
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
    loadProjectManifest.mockResolvedValue(
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

    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining("open Unity")
    );
  });
});
