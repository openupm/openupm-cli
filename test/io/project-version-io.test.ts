import { ReadTextFile } from "../../src/io/text-file-io";
import { StringFormatError } from "../../src/utils/string-parsing";
import { mockService } from "../services/service.mock";
import { makeLoadProjectVersion } from "../../src/io/project-version-io";
import {
  FileMissingError,
  FileParseError,
  GenericIOError,
} from "../../src/io/common-errors";

describe("project-version-io", () => {
  describe("load", () => {
    function makeDependencies() {
      const readFile = mockService<ReadTextFile>();

      const loadProjectVersion = makeLoadProjectVersion(readFile);

      return { loadProjectVersion, readFile } as const;
    }

    it("should fail if file is missing", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      readFile.mockResolvedValue(null);

      const result = await loadProjectVersion("/some/bad/path").promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(FileMissingError)
      );
    });

    it("should fail if file could not be read", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      readFile.mockRejectedValue(new GenericIOError("Read"));

      const result = await loadProjectVersion("/some/bad/path").promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(GenericIOError)
      );
    });

    it("should fail if file does not contain valid yaml", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      readFile.mockResolvedValue("{ this is not valid yaml");

      await expect(
        loadProjectVersion("/some/path").promise
      ).rejects.toBeInstanceOf(StringFormatError);
    });

    it("should fail if yaml does not contain editor-version", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      readFile.mockResolvedValue("thisIsYaml: but not what we want");

      const result = await loadProjectVersion("/some/path").promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(FileParseError)
      );
    });

    it("should load valid version strings", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      const expected = "2022.1.2f1";
      readFile.mockResolvedValue(`m_EditorVersion: ${expected}`);

      const result = await loadProjectVersion("/some/path").promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });
  });
});
