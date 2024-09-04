import RegClient from "another-npm-registry-client";
import nock from "nock";
import { Env, ParseEnv } from "../../../src/cli/parse-env";
import {
  CompatibilityCheckFailedError,
  makeAddCmd,
  PackageIncompatibleError,
  UnresolvedDependenciesError,
} from "../../../src/cli/cmd-add";
import { ResultCodes } from "../../../src/cli/result-codes";
import { PackumentNotFoundError } from "../../../src/common-errors";
import { DomainName } from "../../../src/domain/domain-name";
import { emptyProjectManifest } from "../../../src/domain/project-manifest";
import { unityRegistryUrl } from "../../../src/domain/registry-url";
import { SemanticVersion } from "../../../src/domain/semantic-version";
import { fetchCheckUrlExists } from "../../../src/io/check-url";
import { getRegistryPackumentUsing } from "../../../src/io/packument-io";
import { noopLogger } from "../../../src/logging";
import { buildPackument } from "../../common/data-packument";
import { buildProjectManifest } from "../../common/data-project-manifest";
import { exampleRegistryUrl } from "../../common/data-registry";
import { makeMockLogger } from "../../common/log.mock";
import { mockFunctionOfType } from "../app/func.mock";
import { MockFs } from "../fs.mock";
import { mockRegistryPackuments } from "../registry.mock";

describe("cmd-add", () => {
  const someVersion = SemanticVersion.parse("1.0.0");
  const unknownPackage = DomainName.parse("com.unknown.parse");

  const otherPackument = buildPackument("com.other.package", (packument) =>
    packument.addVersion("1.0.0", (version) => version.set("unity", "2022.2"))
  );
  const somePackument = buildPackument("com.some.package", (packument) =>
    packument.addVersion("1.0.0", (version) =>
      version.set("unity", "2022.2").addDependency(otherPackument.name, "1.0.0")
    )
  );

  const badEditorPackument = buildPackument("com.bad.package", (packument) =>
    packument.addVersion("1.0.0", (version) =>
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      version.set("unity", "bad value")
    )
  );
  const incompatiblePackument = buildPackument(
    "com.incompatible.package",
    (packument) =>
      packument.addVersion("1.0.0", (version) => version.set("unity", "2023.1"))
  );
  const packumentWithBadDependency = buildPackument(
    "com.bad-dep.package",
    (packument) =>
      packument.addVersion("1.0.0", (version) =>
        version.addDependency(unknownPackage, someVersion)
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
      mockFs.read,
      mockFs.write,
      log,
      noopLogger
    );
    return {
      addCmd,
      parseEnv,
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
      badEditorPackument,
      incompatiblePackument,
    ]);
    mockRegistryPackuments(unityRegistryUrl, []);
  });

  it("should notify if editor-version is unknown", async () => {
    const { addCmd, mockFs, log } = makeDependencies();
    mockFs.putProjectVersion(someProjectDir, "bad version");

    await addCmd(somePackument.name, {});

    expect(log.warn).toHaveBeenCalledWith(
      "editor.version",
      expect.stringContaining("unknown")
    );
  });

  it("should add package with invalid editor version when running with force", async () => {
    const { addCmd } = makeDependencies();

    const resultCode = await addCmd(badEditorPackument.name, {
      force: true,
    });

    expect(resultCode).toEqual(ResultCodes.Ok);
  });

  it("should add package with incompatible with editor when running with force", async () => {
    const { addCmd } = makeDependencies();

    const resultCode = await addCmd(incompatiblePackument.name, {
      force: true,
    });

    expect(resultCode).toEqual(ResultCodes.Ok);
  });

  it("should fail when adding package with incompatible with editor and not running with force", async () => {
    const { addCmd } = makeDependencies();

    await expect(addCmd(incompatiblePackument.name, {})).rejects.toBeInstanceOf(
      PackageIncompatibleError
    );
  });

  it("should fail if package could not be resolved", async () => {
    const { addCmd } = makeDependencies();

    await expect(() => addCmd(unknownPackage, {})).rejects.toBeInstanceOf(
      PackumentNotFoundError
    );
  });

  it("should fail if packument had malformed target editor and not running with force", async () => {
    const { addCmd } = makeDependencies();

    await expect(() =>
      addCmd(badEditorPackument.name, {})
    ).rejects.toBeInstanceOf(CompatibilityCheckFailedError);
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

    await addCmd(somePackument.name, {});

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
      expect.objectContaining({
        dependencies: { [somePackument.name]: "1.0.0" },
      })
    );
  });

  it("should notify if package was added", async () => {
    const { addCmd, log } = makeDependencies();

    await addCmd(somePackument.name, {});

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
        manifest.addDependency(somePackument.name, "0.1.0", true, true)
      ),
    });

    await addCmd(somePackument.name, {});

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
      expect.objectContaining({
        dependencies: { [somePackument.name]: "1.0.0" },
      })
    );
  });

  it("should notify if package was replaced", async () => {
    const { addCmd, log, mockFs } = makeDependencies();
    mockFs.putUnityProject({
      projectDirectory: someProjectDir,
      manifest: buildProjectManifest((manifest) =>
        manifest.addDependency(somePackument.name, "0.1.0", true, true)
      ),
    });

    await addCmd(somePackument.name, {});

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
        manifest.addDependency(somePackument.name, "1.0.0", true, true)
      ),
    });

    await addCmd(somePackument.name, {});

    expect(log.notice).toHaveBeenCalledWith(
      "manifest",
      expect.stringContaining("existed")
    );
  });

  it("should add scope for package", async () => {
    const { addCmd, mockFs } = makeDependencies();

    await addCmd(somePackument.name, {});

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
      expect.objectContaining({
        scopedRegistries: [
          {
            name: "example.com",
            url: exampleRegistryUrl,
            scopes: [otherPackument.name, somePackument.name],
          },
        ],
      })
    );
  });

  it("should add package to testables when running with test option", async () => {
    const { addCmd, mockFs } = makeDependencies();

    await addCmd(somePackument.name, {
      test: true,
    });

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(
      expect.objectContaining({
        testables: [somePackument.name],
      })
    );
  });

  it("should not save if nothing changed", async () => {
    const { addCmd, mockFs } = makeDependencies();
    const initial = buildProjectManifest((manifest) =>
      manifest
        .addDependency(somePackument.name, "1.0.0", true, false)
        .addScope(otherPackument.name)
    );
    mockFs.putUnityProject({
      projectDirectory: someProjectDir,
      manifest: initial,
    });

    await addCmd(somePackument.name, {});

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(initial);
  });

  it("should be atomic", async () => {
    const { addCmd, mockFs } = makeDependencies();

    // The second package can not be added
    await addCmd(
      [somePackument.name, DomainName.parse("com.unknown.package")],
      {}
    ).catch(() => {});

    // Because adding is atomic the manifest should only be written if
    // all packages were added.

    const actual = mockFs.tryGetUnityProject(someProjectDir);
    expect(actual).toEqual(emptyProjectManifest);
  });

  it("should suggest to open Unity after save", async () => {
    const { addCmd, log } = makeDependencies();

    await addCmd(somePackument.name, {});

    expect(log.notice).toHaveBeenCalledWith(
      "",
      expect.stringContaining("open Unity")
    );
  });
});
