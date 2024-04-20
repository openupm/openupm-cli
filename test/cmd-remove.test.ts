import { buildProjectManifest } from "./data-project-manifest";
import { makeDomainName } from "../src/domain/domain-name";
import { makeSemanticVersion } from "../src/domain/semantic-version";
import { makePackageReference } from "../src/domain/package-reference";
import { spyOnLog } from "./log.mock";
import {
  mockProjectManifest,
  spyOnSavedManifest,
} from "./project-manifest-io.mock";
import { mockUpmConfig } from "./upm-config-io.mock";
import { mockProjectVersion } from "./project-version-io.mock";
import { exampleRegistryUrl } from "./data-registry";
import { makeRemoveCmd } from "../src/cli/cmd-remove";

const packageA = makeDomainName("com.example.package-a");
const packageB = makeDomainName("com.example.package-b");
const missingPackage = makeDomainName("pkg-not-exist");

function makeDependencies() {
  const removeCmd = makeRemoveCmd();
  return [removeCmd] as const;
}

describe("cmd-remove", () => {
  describe("remove", () => {
    const defaultManifest = buildProjectManifest((manifest) =>
      manifest
        .addDependency(packageA, "1.0.0", true, false)
        .addDependency(packageB, "1.0.0", true, false)
    );

    beforeEach(() => {
      mockProjectManifest(defaultManifest);
      mockUpmConfig(null);
      mockProjectVersion("2020.2.1f1");
    });

    it("should remove packument without version", async () => {
      const [removeCmd] = makeDependencies();
      const noticeSpy = spyOnLog("notice");
      const manifestSavedSpy = spyOnSavedManifest();
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };

      const removeResult = await removeCmd(packageA, options);

      expect(removeResult).toBeOk();
      expect(manifestSavedSpy).toHaveBeenCalledWith(
        expect.any(String),
        buildProjectManifest((manifest) =>
          manifest.addDependency(packageB, "1.0.0", true, false)
        )
      );
      expect(noticeSpy).toHaveLogLike("manifest", "removed ");
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });
    it("should fail to remove packument with semantic version", async () => {
      const [removeCmd] = makeDependencies();
      const warnSpy = spyOnLog("warn");
      const manifestSavedSpy = spyOnSavedManifest();
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };

      const removeResult = await removeCmd(
        makePackageReference(packageA, makeSemanticVersion("1.0.0")),
        options
      );

      expect(removeResult).toBeError();
      expect(manifestSavedSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveLogLike("", "do not specify a version");
    });
    it("should fail for uninstalled packument", async () => {
      const [removeCmd] = makeDependencies();
      const errorSpy = spyOnLog("error");
      const manifestSavedSpy = spyOnSavedManifest();
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };

      const removeResult = await removeCmd(missingPackage, options);

      expect(removeResult).toBeError();
      expect(manifestSavedSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveLogLike("404", "package not found");
    });
    it("should remove multiple packuments", async () => {
      const [removeCmd] = makeDependencies();
      const noticeSpy = spyOnLog("notice");
      const manifestSavedSpy = spyOnSavedManifest();
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };

      const removeResult = await removeCmd([packageA, packageB], options);

      expect(removeResult).toBeOk();
      expect(manifestSavedSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ dependencies: {} })
      );
      expect(noticeSpy).toHaveLogLike(
        "manifest",
        "removed com.example.package-a"
      );
      expect(noticeSpy).toHaveLogLike(
        "manifest",
        "removed com.example.package-b"
      );
      expect(noticeSpy).toHaveLogLike("", "open Unity");
    });
  });
});
