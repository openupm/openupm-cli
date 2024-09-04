import RegClient from "another-npm-registry-client";
import nock from "nock";
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
import { DomainName } from "../../../src/domain/domain-name";
import { UnityPackumentVersion } from "../../../src/domain/packument";
import { emptyProjectManifest } from "../../../src/domain/project-manifest";
import { unityRegistryUrl } from "../../../src/domain/registry-url";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import { fetchCheckUrlExists } from "../../../src/io/check-url";
import { getRegistryPackumentUsing } from "../../../src/io/packument-io";
import { noopLogger } from "../../../src/logging";
import { AsyncErr, AsyncOk } from "../../../src/utils/result-utils";
import { buildPackument } from "../../common/data-packument";
import { buildProjectManifest } from "../../common/data-project-manifest";
import { exampleRegistryUrl } from "../../common/data-registry";
import { makeMockLogger } from "../../common/log.mock";
import { mockFunctionOfType } from "../app/func.mock";
import { mockResolvedPackuments } from "../app/remote-packuments.mock";
import { MockFs } from "../fs.mock";
import { mockRegistryPackuments } from "../registry.mock";

describe("cmd-add", () => {
  const someVersion = SemanticVersion.parse("1.0.0");

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
  const packumentWithBadDependency = buildPackument(
    "com.another.package",
    (packument) =>
      packument.addVersion("1.0.0", (version) =>
        version.addDependency("com.unknown.package", someVersion)
      )
  );

  const someProjectDir = "/users/some-user/projects/SomeProject";
  const defaultEnv = {
    cwd: someProjectDir,
    upstream: true,
    primaryRegistryUrl: exampleRegistryUrl,
  } as Env;

  function makeDependencies() {
    const parseEnv = mockFunctionOfType<ParseEnv>();
    parseEnv.mockResolvedValue(defaultEnv);

    const getRegistryPackumentVersion =
      mockFunctionOfType<GetRegistryPackumentVersion>();
    mockResolvedPackuments(
      getRegistryPackumentVersion,
      [exampleRegistryUrl, somePackument],
      [exampleRegistryUrl, otherPackument],
      [exampleRegistryUrl, packumentWithBadDependency]
    );

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

    const addCmd = makeAddCmd(
      parseEnv,
      fetchCheckUrlExists,
      fetchPackument,
      getRegistryPackumentVersion,
      mockFs.read,
      mockFs.write,
      log,
      noopLogger
    );
    return {
      addCmd,
      parseEnv,
      getRegistryPackumentVersion,
      mockFs,
      log,
    } as const;
  }

  afterEach(() => {
    nock.cleanAll();
  });

  beforeEach(() => {
    mockRegistryPackuments(exampleRegistryUrl, [
      somePackument,
      otherPackument,
      packumentWithBadDependency,
    ]);
    mockRegistryPackuments(unityRegistryUrl, []);
  });

  it("should notify if editor-version is unknown", async () => {
    const { addCmd, mockFs, log } = makeDependencies();
    mockFs.putProjectVersion(someProjectDir, "bad version");

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
    const { addCmd } = makeDependencies();

    await expect(() =>
      addCmd(packumentWithBadDependency.name, {})
    ).rejects.toBeInstanceOf(UnresolvedDependenciesError);
  });

  it("should add package with unresolved dependency when running with force", async () => {
    const { addCmd } = makeDependencies();

    const resultCode = await addCmd(packumentWithBadDependency.name, {
      force: true,
    });

    expect(resultCode).toEqual(ResultCodes.Ok);
  });

  it("should add package", async () => {
    const { addCmd, mockFs } = makeDependencies();

    await addCmd(somePackage, {});

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
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
    const { addCmd, mockFs } = makeDependencies();
    mockFs.putUnityProject({
      projectDirectory: someProjectDir,
      manifest: buildProjectManifest((manifest) =>
        manifest.addDependency(somePackage, "0.1.0", true, true)
      ),
    });

    await addCmd(somePackage, {});

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
      expect.objectContaining({
        dependencies: { [somePackage]: "1.0.0" },
      })
    );
  });

  it("should notify if package was replaced", async () => {
    const { addCmd, log, mockFs } = makeDependencies();
    mockFs.putUnityProject({
      projectDirectory: someProjectDir,
      manifest: buildProjectManifest((manifest) =>
        manifest.addDependency(somePackage, "0.1.0", true, true)
      ),
    });

    await addCmd(somePackage, {});

    expect(log.notice).toHaveBeenCalledWith(
      "manifest",
      expect.stringContaining("modified")
    );
  });

  it("should notify if package is already in manifest", async () => {
    const { addCmd, log, mockFs } = makeDependencies();
    mockFs.putUnityProject({
      projectDirectory: someProjectDir,
      manifest: buildProjectManifest((manifest) =>
        manifest.addDependency(somePackage, "1.0.0", true, true)
      ),
    });

    await addCmd(somePackage, {});

    expect(log.notice).toHaveBeenCalledWith(
      "manifest",
      expect.stringContaining("existed")
    );
  });

  it("should add scope for package", async () => {
    const { addCmd, mockFs } = makeDependencies();

    await addCmd(somePackage, {});

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
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
    const { addCmd, mockFs } = makeDependencies();

    await addCmd(somePackage, {
      test: true,
    });

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
      expect.objectContaining({
        testables: [somePackage],
      })
    );
  });

  it("should not save if nothing changed", async () => {
    const { addCmd, mockFs } = makeDependencies();
    const initial = buildProjectManifest((manifest) =>
      manifest
        .addDependency(somePackage, "1.0.0", true, false)
        .addScope(otherPackage)
    );
    mockFs.putUnityProject({
      projectDirectory: someProjectDir,
      manifest: initial,
    });

    await addCmd(somePackage, {});

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(initial);
  });

  it("should be atomic", async () => {
    const { addCmd, mockFs } = makeDependencies();

    // The second package can not be added
    await addCmd(
      [somePackage, DomainName.parse("com.unknown.package")],
      {}
    ).catch(() => {});

    // Because adding is atomic the manifest should only be written if
    // all packages were added.

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(emptyProjectManifest);
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
