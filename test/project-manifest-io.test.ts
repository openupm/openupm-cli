import {
  makeProjectManifestLoader,
  makeProjectManifestWriter,
  ManifestLoadError,
  manifestPathFor,
} from "../src/io/project-manifest-io";
import {
  emptyProjectManifest,
  mapScopedRegistry,
} from "../src/domain/project-manifest";
import path from "path";
import * as fileIoModule from "../src/io/file-io";
import { IOError, NotFoundError } from "../src/io/file-io";
import { Err, Ok } from "ts-results-es";
import { buildProjectManifest } from "./data-project-manifest";
import { DomainName } from "../src/domain/domain-name";
import { removeScope } from "../src/domain/scoped-registry";
import { exampleRegistryUrl } from "./data-registry";
import { StringFormatError } from "../src/utils/string-parsing";

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
      const loadProjectManifest = makeProjectManifestLoader();
      return { loadProjectManifest } as const;
    }

    it("should fail if file could not be read", async () => {
      const { loadProjectManifest } = makeDependencies();
      const expected = new IOError();
      jest
        .spyOn(fileIoModule, "tryReadTextFromFile")
        .mockReturnValue(Err(expected).toAsyncResult());

      const result = await loadProjectManifest("/some/path").promise;

      expect(result).toBeError((actual: ManifestLoadError) =>
        expect(actual.cause).toEqual(expected)
      );
    });

    it("should fail if file is not found", async () => {
      const { loadProjectManifest } = makeDependencies();
      const expected = new NotFoundError("/some/path");
      jest
        .spyOn(fileIoModule, "tryReadTextFromFile")
        .mockReturnValue(Err(expected).toAsyncResult());

      const result = await loadProjectManifest("/some/path").promise;

      expect(result).toBeError((actual: ManifestLoadError) =>
        expect(actual.cause).toEqual(expected)
      );
    });

    it("should fail if file does not contain json", async () => {
      const { loadProjectManifest } = makeDependencies();
      jest
        .spyOn(fileIoModule, "tryReadTextFromFile")
        .mockReturnValue(Ok("{} dang, this is not json []").toAsyncResult());

      const result = await loadProjectManifest("/some/path").promise;

      expect(result).toBeError((actual: ManifestLoadError) =>
        expect(actual.cause).toBeInstanceOf(StringFormatError)
      );
    });

    it("should load valid manifest", async () => {
      const { loadProjectManifest } = makeDependencies();
      jest
        .spyOn(fileIoModule, "tryReadTextFromFile")
        .mockReturnValue(
          Ok(`{ "dependencies": { "com.package.a": "1.0.0"} }`).toAsyncResult()
        );

      const result = await loadProjectManifest("/some/path").promise;

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
      const writeProjectManifest = makeProjectManifestWriter();
      return [writeProjectManifest] as const;
    }

    it("should fail if file could not be written", async () => {
      const expected = new IOError();
      const [writeProjectManifest] = makeDependencies();
      jest
        .spyOn(fileIoModule, "tryWriteTextToFile")
        .mockReturnValue(Err(expected).toAsyncResult());

      const result = await writeProjectManifest(
        "/some/path",
        emptyProjectManifest
      ).promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should write manifest json", async () => {
      const [writeProjectManifest] = makeDependencies();
      const writeSpy = jest
        .spyOn(fileIoModule, "tryWriteTextToFile")
        .mockReturnValue(Ok(undefined).toAsyncResult());
      const manifest = buildProjectManifest((manifest) =>
        manifest.addDependency("com.package.a", "1.0.0", true, true)
      );

      await writeProjectManifest("/some/path", manifest).promise;

      expect(writeSpy).toHaveBeenCalledWith(
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
      const [writeProjectManifest] = makeDependencies();
      const writeSpy = jest
        .spyOn(fileIoModule, "tryWriteTextToFile")
        .mockReturnValue(Ok(undefined).toAsyncResult());
      // Add and then remove a scope to force an empty scoped-registry
      const testDomain = "test" as DomainName;
      let manifest = buildProjectManifest((manifest) =>
        manifest.addScope(testDomain)
      );
      manifest = mapScopedRegistry(manifest, exampleRegistryUrl, (registry) => {
        return removeScope(registry!, testDomain);
      });

      await writeProjectManifest("/some/path", manifest).promise;

      expect(writeSpy).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify({ dependencies: {}, scopedRegistries: [] }, null, 2)
      );
    });
  });
});
