import { UnityProjectManifest } from "../../../src/domain/project-manifest";
import {
  ManifestMalformedError,
  ManifestMissingError,
  loadProjectManifestUsing,
  serializeProjectManifest,
} from "../../../src/io/project-manifest-io";
import { ReadTextFile } from "../../../src/io/text-file-io";
import { noopLogger } from "../../../src/domain/logging";
import { partialApply } from "../../../src/domain/fp-utils";
import { exampleRegistryUrl } from "../../common/data-registry";
import { mockFunctionOfType } from "../func.mock";

const exampleProjectPath = "/some/path";
describe("project-manifest io", () => {
  describe("read file", () => {
    function makeDependencies() {
      const readFile = mockFunctionOfType<ReadTextFile>();

      const loadProjectManifest = partialApply(
        loadProjectManifestUsing,
        readFile,
        noopLogger
      );
      return { loadProjectManifest, readFile } as const;
    }

    it("should fail if file is missing", async () => {
      const { loadProjectManifest, readFile } = makeDependencies();
      readFile.mockResolvedValue(null);

      await expect(
        loadProjectManifest(exampleProjectPath)
      ).rejects.toBeInstanceOf(ManifestMissingError);
    });

    it("should fail if manifest could not be parsed", async () => {
      const { loadProjectManifest, readFile } = makeDependencies();
      readFile.mockResolvedValue("not {} valid : json");

      await expect(
        loadProjectManifest(exampleProjectPath)
      ).rejects.toBeInstanceOf(ManifestMalformedError);
    });

    it("should load valid manifest", async () => {
      const { loadProjectManifest, readFile } = makeDependencies();
      readFile.mockResolvedValue(
        `{ "dependencies": { "com.package.a": "1.0.0"} }`
      );

      const actual = await loadProjectManifest(exampleProjectPath);

      expect(actual).toEqual({
        dependencies: {
          "com.package.a": "1.0.0",
        },
      });
    });
  });

  describe("serialize manifest", () => {
    it("should prune empty scoped registries", () => {
      const manifest: UnityProjectManifest = {
        dependencies: {},
        scopedRegistries: [
          // Scoped registry with no scopes
          { name: "some registry", url: exampleRegistryUrl, scopes: [] },
        ],
      };

      const json = serializeProjectManifest(manifest);

      // The registry should not be in the output json
      expect(json).not.toContain("some registry");
    });
  });
});
