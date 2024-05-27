import {
  makeProjectManifestLoader,
  makeProjectManifestWriter,
  manifestPathFor,
} from "../../src/io/project-manifest-io";
import {
  emptyProjectManifest,
  mapScopedRegistry,
} from "../../src/domain/project-manifest";
import path from "path";
import { FileParseError } from "../../src/common-errors";
import { ReadTextFile, WriteTextFile } from "../../src/io/fs-result";
import { Err, Ok } from "ts-results-es";
import { buildProjectManifest } from "../domain/data-project-manifest";
import { DomainName } from "../../src/domain/domain-name";
import { removeScope } from "../../src/domain/scoped-registry";
import { exampleRegistryUrl } from "../domain/data-registry";
import { mockService } from "../services/service.mock";
import { eaccesError, enoentError } from "./node-error.mock";
import { FileMissingError, GenericIOError } from "../../src/io/common-errors";

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

      const loadProjectManifest = makeProjectManifestLoader(readFile);
      return { loadProjectManifest, readFile } as const;
    }

    it("should fail if file could not be read", async () => {
      const { loadProjectManifest, readFile } = makeDependencies();
      readFile.mockReturnValue(Err(eaccesError).toAsyncResult());

      const result = await loadProjectManifest(exampleProjectPath).promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(GenericIOError)
      );
    });

    it("should fail if file is missing", async () => {
      const { loadProjectManifest, readFile } = makeDependencies();
      readFile.mockReturnValue(Err(enoentError).toAsyncResult());

      const result = await loadProjectManifest(exampleProjectPath).promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(FileMissingError)
      );
    });

    it("should fail if file does not contain json", async () => {
      const { loadProjectManifest, readFile } = makeDependencies();
      readFile.mockReturnValue(
        Ok("{} dang, this is not json []").toAsyncResult()
      );

      const result = await loadProjectManifest(exampleProjectPath).promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(FileParseError)
      );
    });

    it("should load valid manifest", async () => {
      const { loadProjectManifest, readFile } = makeDependencies();
      readFile.mockReturnValue(
        Ok(`{ "dependencies": { "com.package.a": "1.0.0"} }`).toAsyncResult()
      );

      const result = await loadProjectManifest(exampleProjectPath).promise;

      expect(result).toBeOk((actual) =>
        expect(actual).toEqual({
          dependencies: {
            "com.package.a": "1.0.0",
          },
        })
      );
    });
  });

  describe("write", () => {
    function makeDependencies() {
      const writeFile = mockService<WriteTextFile>();
      writeFile.mockReturnValue(Ok(undefined).toAsyncResult());

      const writeProjectManifest = makeProjectManifestWriter(writeFile);
      return { writeProjectManifest, writeFile } as const;
    }

    it("should fail if file could not be written", async () => {
      const expected = eaccesError;
      const { writeProjectManifest, writeFile } = makeDependencies();
      writeFile.mockReturnValue(Err(expected).toAsyncResult());

      const result = await writeProjectManifest(
        exampleProjectPath,
        emptyProjectManifest
      ).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should write manifest json", async () => {
      const { writeProjectManifest, writeFile } = makeDependencies();

      const manifest = buildProjectManifest((manifest) =>
        manifest.addDependency("com.package.a", "1.0.0", true, true)
      );

      await writeProjectManifest(exampleProjectPath, manifest).promise;

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

      await writeProjectManifest(exampleProjectPath, manifest).promise;

      expect(writeFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify({ dependencies: {}, scopedRegistries: [] }, null, 2)
      );
    });
  });
});
