import {
  makeRemovePackages,
  RemovedPackage,
} from "../../src/services/remove-packages";
import { mockService } from "./service.mock";
import {
  LoadProjectManifest,
  WriteProjectManifest,
} from "../../src/io/project-manifest-io";
import { makeDomainName } from "../../src/domain/domain-name";
import { buildProjectManifest } from "../domain/data-project-manifest";
import path from "path";
import { PackumentNotFoundError } from "../../src/common-errors";

describe("remove packages", () => {
  const someProjectPath = path.resolve("/home/projects/MyUnityProject");
  const somePackage = makeDomainName("com.some.package");
  const otherPackage = makeDomainName("com.other.package");

  const defaultManifest = buildProjectManifest((manifest) =>
    manifest.addDependency(somePackage, "1.0.0", true, true)
  );

  function makeDependencies() {
    const loadProjectManifest = mockService<LoadProjectManifest>();
    loadProjectManifest.mockResolvedValue(defaultManifest);

    const writeProjectManifest = mockService<WriteProjectManifest>();
    writeProjectManifest.mockResolvedValue(undefined);

    const removePackages = makeRemovePackages(
      loadProjectManifest,
      writeProjectManifest
    );
    return {
      removePackages,
      loadProjectManifest,
      writeProjectManifest,
    } as const;
  }

  it("should fail if package is not in manifest", async () => {
    const { removePackages } = makeDependencies();

    const result = await removePackages(someProjectPath, [otherPackage])
      .promise;

    expect(result).toBeError((actual) =>
      expect(actual).toBeInstanceOf(PackumentNotFoundError)
    );
  });

  it("should return removed version", async () => {
    const { removePackages } = makeDependencies();

    const result = await removePackages(someProjectPath, [somePackage]).promise;

    expect(result).toBeOk((removedPackage: RemovedPackage) =>
      expect(removedPackage).toEqual([{ name: somePackage, version: "1.0.0" }])
    );
  });

  it("should be atomic for multiple packages", async () => {
    const { removePackages, writeProjectManifest } = makeDependencies();

    // One of these packages can not be removed, so none should be removed.
    await removePackages(someProjectPath, [somePackage, otherPackage]).promise;

    expect(writeProjectManifest).not.toHaveBeenCalled();
  });

  it("should remove package from manifest", async () => {
    const { removePackages, writeProjectManifest } = makeDependencies();

    await removePackages(someProjectPath, [somePackage]).promise;

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
    const { removePackages, writeProjectManifest } = makeDependencies();

    await removePackages(someProjectPath, [somePackage]).promise;

    expect(writeProjectManifest).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.objectContaining({
        scopes: [somePackage],
      })
    );
  });
});
