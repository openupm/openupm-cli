import { remove } from "../src/cli/cmd-remove";
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

const packageA = makeDomainName("com.example.package-a");
const packageB = makeDomainName("com.example.package-b");
const missingPackage = makeDomainName("pkg-not-exist");

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
      const noticeSpy = spyOnLog("notice");
      const manifestSavedSpy = spyOnSavedManifest();
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };

      const removeResult = await remove(packageA, options);

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
      const warnSpy = spyOnLog("warn");
      const manifestSavedSpy = spyOnSavedManifest();
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };

      const removeResult = await remove(
        makePackageReference(packageA, makeSemanticVersion("1.0.0")),
        options
      );

      expect(removeResult).toBeError();
      expect(manifestSavedSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveLogLike("", "do not specify a version");
    });
    it("should fail for uninstalled packument", async () => {
      const errorSpy = spyOnLog("error");
      const manifestSavedSpy = spyOnSavedManifest();
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };

      const removeResult = await remove(missingPackage, options);

      expect(removeResult).toBeError();
      expect(manifestSavedSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveLogLike("404", "package not found");
    });
    it("should remove multiple packuments", async () => {
      const noticeSpy = spyOnLog("notice");
      const manifestSavedSpy = spyOnSavedManifest();
      const options = {
        _global: {
          registry: exampleRegistryUrl,
        },
      };

      const removeResult = await remove([packageA, packageB], options);

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
