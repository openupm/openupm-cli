import path from "path";
import { PackumentNotFoundError } from "../../../src/common-errors";
import { DomainName } from "../../../src/domain/domain-name";
import {
  LoadProjectManifest,
  SaveProjectManifest,
} from "../../../src/io/project-manifest-io";
import {
  RemovedPackage,
  RemovePackagesFromManifest,
} from "../../../src/services/remove-packages";
import { buildProjectManifest } from "../domain/data-project-manifest";
import { mockFunctionOfType } from "./func.mock";

describe("remove packages from manifest", () => {
  const someProjectPath = path.resolve("/home/projects/MyUnityProject");
  const somePackage = DomainName.parse("com.some.package");
  const otherPackage = DomainName.parse("com.other.package");

  const defaultManifest = buildProjectManifest((manifest) =>
    manifest.addDependency(somePackage, "1.0.0", true, true)
  );

  function makeDependencies() {
    const loadProjectManifest = mockFunctionOfType<LoadProjectManifest>();
    loadProjectManifest.mockResolvedValue(defaultManifest);

    const writeProjectManifest = mockFunctionOfType<SaveProjectManifest>();
    writeProjectManifest.mockResolvedValue(undefined);

    const removePackagesFromManifestu = RemovePackagesFromManifest(
      loadProjectManifest,
      writeProjectManifest
    );
    return {
      removePackagesFromManifestu,
      loadProjectManifest,
      writeProjectManifest,
    } as const;
  }

  it("should fail if package is not in manifest", async () => {
    const { removePackagesFromManifestu } = makeDependencies();

    const result = await removePackagesFromManifestu(someProjectPath, [
      otherPackage,
    ]).promise;

    expect(result).toBeError((actual) =>
      expect(actual).toBeInstanceOf(PackumentNotFoundError)
    );
  });

  it("should return removed version", async () => {
    const { removePackagesFromManifestu } = makeDependencies();

    const result = await removePackagesFromManifestu(someProjectPath, [
      somePackage,
    ]).promise;

    expect(result).toBeOk((removedPackage: RemovedPackage) =>
      expect(removedPackage).toEqual([{ name: somePackage, version: "1.0.0" }])
    );
  });

  it("should be atomic for multiple packages", async () => {
    const { removePackagesFromManifestu, writeProjectManifest } =
      makeDependencies();

    // One of these packages can not be removed, so none should be removed.
    await removePackagesFromManifestu(someProjectPath, [
      somePackage,
      otherPackage,
    ]).promise;

    expect(writeProjectManifest).not.toHaveBeenCalled();
  });

  it("should remove package from manifest", async () => {
    const { removePackagesFromManifestu, writeProjectManifest } =
      makeDependencies();

    await removePackagesFromManifestu(someProjectPath, [somePackage]).promise;

    expect(writeProjectManifest).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.objectContaining({
        dependencies: {
          [somePackage]: expect.anything(),
        },
      })
    );
  });

  it("should remove scope from manifest", async () => {
    const { removePackagesFromManifestu, writeProjectManifest } =
      makeDependencies();

    await removePackagesFromManifestu(someProjectPath, [somePackage]).promise;

    expect(writeProjectManifest).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.objectContaining({
        scopes: [somePackage],
      })
    );
  });
});
