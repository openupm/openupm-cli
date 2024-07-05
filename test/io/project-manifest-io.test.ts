import {
  makeLoadProjectManifest,
  makeWriteProjectManifest,
  manifestPathFor,
} from "../../src/io/project-manifest-io";
import { mapScopedRegistry } from "../../src/domain/project-manifest";
import path from "path";
import { ReadTextFile, WriteTextFile } from "../../src/io/text-file-io";
import { buildProjectManifest } from "../domain/data-project-manifest";
import { DomainName } from "../../src/domain/domain-name";
import { removeScope } from "../../src/domain/scoped-registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockService } from "../services/service.mock";
import { noopLogger } from "../../src/logging";

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

  describe("load", () => {
    function makeDependencies() {
      const readFile = mockService<ReadTextFile>();

      const loadProjectManifest = makeLoadProjectManifest(readFile, noopLogger);
      return { loadProjectManifest, readFile } as const;
    }

    it("should fail if file is missing", async () => {
      const { loadProjectManifest, readFile } = makeDependencies();
      readFile.mockResolvedValue(null);

      await expect(
        loadProjectManifest(exampleProjectPath)
      ).rejects.toBeDefined();
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

  describe("write", () => {
    function makeDependencies() {
      const writeFile = mockService<WriteTextFile>();
      writeFile.mockResolvedValue(undefined);

      const writeProjectManifest = makeWriteProjectManifest(writeFile);
      return { writeProjectManifest, writeFile } as const;
    }

    it("should write manifest json", async () => {
      const { writeProjectManifest, writeFile } = makeDependencies();

      const manifest = buildProjectManifest((manifest) =>
        manifest.addDependency("com.package.a", "1.0.0", true, true)
      );

      await writeProjectManifest(exampleProjectPath, manifest);

      expect(writeFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(
          {
            dependencies: {
              "com.package.a": "1.0.0",
            },
            scopedRegistries: [
              {
                name: "example.com",
                url: exampleRegistryUrl,
                scopes: ["com.package.a"],
              },
            ],
            testables: ["com.package.a"],
          },
          null,
          2
        )
      );
    });

    it("should prune manifest before writing", async () => {
      const { writeProjectManifest, writeFile } = makeDependencies();
      // Add and then remove a scope to force an empty scoped-registry
      const testDomain = "test" as DomainName;
      let manifest = buildProjectManifest((manifest) =>
        manifest.addScope(testDomain)
      );
      manifest = mapScopedRegistry(manifest, exampleRegistryUrl, (registry) => {
        return removeScope(registry!, testDomain);
      });

      await writeProjectManifest(exampleProjectPath, manifest);

      expect(writeFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify({ dependencies: {}, scopedRegistries: [] }, null, 2)
      );
    });
  });
});
