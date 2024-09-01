import { UnityProjectManifest } from "../../../src/domain/project-manifest";
import {
  ManifestMalformedError,
  ManifestMissingError,
  ReadProjectManifestFile,
  serializeProjectManifest,
} from "../../../src/io/project-manifest-io";
import { ReadTextFile } from "../../../src/io/text-file-io";
import { noopLogger } from "../../../src/logging";
import { exampleRegistryUrl } from "../../common/data-registry";
import { mockFunctionOfType } from "../app/func.mock";

const exampleProjectPath = "/some/path";
describe("project-manifest io", () => {
  describe("read file", () => {
    function makeDependencies() {
      const readFile = mockFunctionOfType<ReadTextFile>();

      const readProjectManifestFile = ReadProjectManifestFile(
        readFile,
        noopLogger
      );
      return { readProjectManifestFile, readFile } as const;
    }

    it("should fail if file is missing", async () => {
      const { readProjectManifestFile, readFile } = makeDependencies();
      readFile.mockResolvedValue(null);

      await expect(
        readProjectManifestFile(exampleProjectPath)
      ).rejects.toBeInstanceOf(ManifestMissingError);
    });

    it("should fail if manifest could not be parsed", async () => {
      const { readProjectManifestFile, readFile } = makeDependencies();
      readFile.mockResolvedValue("not {} valid : json");

      await expect(
        readProjectManifestFile(exampleProjectPath)
      ).rejects.toBeInstanceOf(ManifestMalformedError);
    });

    it("should load valid manifest", async () => {
      const { readProjectManifestFile, readFile } = makeDependencies();
      readFile.mockResolvedValue(
        `{ "dependencies": { "com.package.a": "1.0.0"} }`
      );

      const actual = await readProjectManifestFile(exampleProjectPath);

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
