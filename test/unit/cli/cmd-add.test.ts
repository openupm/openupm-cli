import { ResolveDependencies } from "../../../src/app/dependency-resolving";
import { DetermineEditorVersion } from "../../../src/app/determine-editor-version";
import { GetRegistryAuth } from "../../../src/app/get-registry-auth";
import {
  GetRegistryPackumentVersion,
  ResolvedPackumentVersion,
} from "../../../src/app/get-registry-packument-version";
import { Env, ParseEnv } from "../../../src/app/parse-env";
import {
  CompatibilityCheckFailedError,
  makeAddCmd,
  PackageIncompatibleError,
  UnresolvedDependenciesError,
} from "../../../src/cli/cmd-add";
import { ResultCodes } from "../../../src/cli/result-codes";
import { PackumentNotFoundError } from "../../../src/common-errors";
import {
  makeGraphFromSeed,
  markFailed,
  markRemoteResolved,
} from "../../../src/domain/dependency-graph";
import { DomainName } from "../../../src/domain/domain-name";
import { makeEditorVersion } from "../../../src/domain/editor-version";
import { UnityPackumentVersion } from "../../../src/domain/packument";
import { emptyProjectManifest } from "../../../src/domain/project-manifest";
import { unityRegistryUrl } from "../../../src/domain/registry-url";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import {
  LoadProjectManifest,
  SaveProjectManifest,
} from "../../../src/io/project-manifest-io";
import { noopLogger } from "../../../src/logging";
import { AsyncErr, AsyncOk } from "../../../src/utils/result-utils";
import { mockFunctionOfType } from "../../integration/app/func.mock";
import { mockResolvedPackuments } from "../../integration/app/remote-packuments.mock";
import { buildPackument } from "../domain/data-packument";
import { buildProjectManifest } from "../domain/data-project-manifest";
import { exampleRegistryUrl } from "../domain/data-registry";
import { makeMockLogger } from "./log.mock";

const somePackage = DomainName.parse("com.some.package");
const otherPackage = DomainName.parse("com.other.package");
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
  primaryRegistryUrl: exampleRegistryUrl,
} as Env;

const someVersion = SemanticVersion.parse("1.0.0");

function makeDependencies() {
  const parseEnv = mockFunctionOfType<ParseEnv>();
  parseEnv.mockResolvedValue(defaultEnv);

  const getRegistryPackumentVersion =
    mockFunctionOfType<GetRegistryPackumentVersion>();
  mockResolvedPackuments(
    getRegistryPackumentVersion,
    [exampleRegistryUrl, somePackument],
    [exampleRegistryUrl, otherPackument]
  );

  const resolveDependencies = mockFunctionOfType<ResolveDependencies>();
  let defaultGraph = makeGraphFromSeed(somePackage, someVersion);
  defaultGraph = markRemoteResolved(
    defaultGraph,
    somePackage,
    someVersion,
    exampleRegistryUrl,
    { [otherPackage]: someVersion }
  );
  defaultGraph = markRemoteResolved(
    defaultGraph,
    otherPackage,
    someVersion,
    exampleRegistryUrl,
    {}
  );
  resolveDependencies.mockResolvedValue(defaultGraph);

  const loadProjectManifest = mockFunctionOfType<LoadProjectManifest>();
  loadProjectManifest.mockResolvedValue(emptyProjectManifest);

  const writeProjectManifest = mockFunctionOfType<SaveProjectManifest>();
  writeProjectManifest.mockResolvedValue(undefined);

  const determineEditorVersion = mockFunctionOfType<DetermineEditorVersion>();
  determineEditorVersion.mockResolvedValue(
    makeEditorVersion(2022, 2, 1, "f", 2)
  );

  const getRegistryAuth = mockFunctionOfType<GetRegistryAuth>();
  getRegistryAuth.mockResolvedValue({ url: exampleRegistryUrl, auth: null });

  const log = makeMockLogger();

  const addCmd = makeAddCmd(
    parseEnv,
    getRegistryPackumentVersion,
    resolveDependencies,
    loadProjectManifest,
    writeProjectManifest,
    determineEditorVersion,
    getRegistryAuth,
    log,
    noopLogger
  );
  return {
    addCmd,
    parseEnv,
    getRegistryPackumentVersion,
    resolveDependencies,
    loadProjectManifest,
    writeProjectManifest,
    determineEditorVersion,
    log,
  } as const;
}

describe("cmd-add", () => {
  it("should notify if editor-version is unknown", async () => {
    const { addCmd, determineEditorVersion, log } = makeDependencies();
    determineEditorVersion.mockResolvedValue("bad version");

    await addCmd(somePackage, {});

    expect(log.warn).toHaveBeenCalledWith(
      "editor.version",
      expect.stringContaining("unknown")
    );
  });

  it("should add package with invalid editor version when running with force", async () => {
    const { addCmd, getRegistryPackumentVersion } = makeDependencies();
    mockResolvedPackuments(getRegistryPackumentVersion, [
      exampleRegistryUrl,
      badEditorPackument,
    ]);

    const resultCode = await addCmd(somePackage, {
      force: true,
    });

    expect(resultCode).toEqual(ResultCodes.Ok);
  });

  it("should add package with incompatible with editor when running with force", async () => {
    const { addCmd, getRegistryPackumentVersion } = makeDependencies();
    mockResolvedPackuments(getRegistryPackumentVersion, [
      exampleRegistryUrl,
      incompatiblePackument,
    ]);

    const resultCode = await addCmd(somePackage, {
      force: true,
    });

    expect(resultCode).toEqual(ResultCodes.Ok);
  });

  it("should fail when adding package with incompatible with editor and not running with force", async () => {
    const { addCmd, getRegistryPackumentVersion } = makeDependencies();
    mockResolvedPackuments(getRegistryPackumentVersion, [
      exampleRegistryUrl,
      incompatiblePackument,
    ]);

    await expect(addCmd(somePackage, {})).rejects.toBeInstanceOf(
      PackageIncompatibleError
    );
  });

  it("should not fetch dependencies for upstream packages", async () => {
    const { addCmd, getRegistryPackumentVersion, resolveDependencies } =
      makeDependencies();
    mockResolvedPackuments(getRegistryPackumentVersion, [
      unityRegistryUrl,
      somePackument,
    ]);

    await addCmd(somePackage, {});

    expect(resolveDependencies).not.toHaveBeenCalled();
  });

  it("should fail if package could not be resolved", async () => {
    const { addCmd, getRegistryPackumentVersion } = makeDependencies();
    getRegistryPackumentVersion.mockReturnValue(
      AsyncErr(new PackumentNotFoundError(somePackage))
    );

    await expect(() => addCmd(somePackage, {})).rejects.toBeInstanceOf(
      PackumentNotFoundError
    );
  });

  it("should fail if packument had malformed target editor and not running with force", async () => {
    const { addCmd, getRegistryPackumentVersion } = makeDependencies();
    getRegistryPackumentVersion.mockReturnValue(
      AsyncOk({
        packumentVersion: {
          name: somePackage,
          version: someVersion,
          unity: "bad vesion",
        } as unknown as UnityPackumentVersion,
      } as unknown as ResolvedPackumentVersion)
    );

    await expect(() => addCmd(somePackage, {})).rejects.toBeInstanceOf(
      CompatibilityCheckFailedError
    );
  });

  it("should fail if dependency could not be resolved and not running with force", async () => {
    const { addCmd, resolveDependencies } = makeDependencies();
    let failedGraph = makeGraphFromSeed(otherPackage, someVersion);
    failedGraph = markFailed(failedGraph, otherPackage, someVersion, {
      [exampleRegistryUrl]: new PackumentNotFoundError(otherPackage),
    });
    resolveDependencies.mockResolvedValue(failedGraph);

    await expect(() => addCmd(somePackage, {})).rejects.toBeInstanceOf(
      UnresolvedDependenciesError
    );
  });

  it("should add package with unresolved dependency when running with force", async () => {
    const { addCmd, resolveDependencies } = makeDependencies();
    let failedGraph = makeGraphFromSeed(otherPackage, someVersion);
    failedGraph = markFailed(failedGraph, otherPackage, someVersion, {
      [exampleRegistryUrl]: new PackumentNotFoundError(otherPackage),
    });
    resolveDependencies.mockResolvedValue(failedGraph);

    const resultCode = await addCmd(somePackage, {
      force: true,
    });

    expect(resultCode).toEqual(ResultCodes.Ok);
  });

  it("should add package", async () => {
    const { addCmd, writeProjectManifest } = makeDependencies();

    await addCmd(somePackage, {});

    expect(writeProjectManifest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        dependencies: { [somePackage]: "1.0.0" },
      })
    );
  });

  it("should notify if package was added", async () => {
    const { addCmd, log } = makeDependencies();

    await addCmd(somePackage, {});

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

    await addCmd(somePackage, {});

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

    await addCmd(somePackage, {});

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

    await addCmd(somePackage, {});

    expect(log.notice).toHaveBeenCalledWith(
      "manifest",
      expect.stringContaining("existed")
    );
  });

  it("should add scope for package", async () => {
    const { addCmd, writeProjectManifest } = makeDependencies();

    await addCmd(somePackage, {});

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

    await addCmd(somePackage, {});

    expect(writeProjectManifest).not.toHaveBeenCalled();
  });

  it("should be atomic", async () => {
    const { addCmd, writeProjectManifest } = makeDependencies();

    // The second package can not be added
    await addCmd(
      [somePackage, DomainName.parse("com.unknown.package")],
      {}
    ).catch(() => {});

    // Because adding is atomic the manifest should only be written if
    // all packages were added.
    expect(writeProjectManifest).not.toHaveBeenCalled();
  });

  it("should suggest to open Unity after save", async () => {
    const { addCmd, log } = makeDependencies();

    await addCmd(somePackage, {});

    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining("open Unity")
    );
  });
});
