import {
  ReadProjectManifestFile,
  WriteProjectManifestFile,
  ManifestMalformedError,
  ManifestMissingError,
  manifestPathFor,
  serializeProjectManifest,
} from "../../../src/io/project-manifest-io";
import {
  mapScopedRegistry,
  UnityProjectManifest,
} from "../../../src/domain/project-manifest";
import path from "path";
import { ReadTextFile, WriteTextFile } from "../../../src/io/text-file-io";
import { buildProjectManifest } from "../domain/data-project-manifest";
import { DomainName } from "../../../src/domain/domain-name";
import { removeScope } from "../../../src/domain/scoped-registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockService } from "../services/service.mock";
import { noopLogger } from "../../../src/logging";

const exampleProjectPath = "/some/path";
describe("project-manifest io", () => {
  describe("path", () => {
    it("should determine correct manifest path", () => {
      const manifestPath = manifestPathFor("test-openupm-cli");
      const expected = path.join(
        "test-openupm-cli",
        "Packages",
        "manifest.json"
      );
      expect(manifestPath).toEqual(expected);
    });
  });

  describe("read file", () => {
    function makeDependencies() {
      const readFile = mockService<ReadTextFile>();

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

    it("should fail if manifest contains invalid json", async () => {
      const { readProjectManifestFile, readFile } = makeDependencies();
      readFile.mockResolvedValue("not {} valid : json");

      await expect(
        readProjectManifestFile(exampleProjectPath)
      ).rejects.toBeInstanceOf(ManifestMalformedError);
    });

    it("should fail if manifest contains invalid content", async () => {
      const { readProjectManifestFile, readFile } = makeDependencies();
      readFile.mockResolvedValue(`123`);

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
