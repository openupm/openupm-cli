import { FsError, FsErrorReason, ReadTextFile } from "../../src/io/file-io";
import { Err, Ok } from "ts-results-es";
import { FileParseError } from "../../src/common-errors";
import { StringFormatError } from "../../src/utils/string-parsing";
import { mockService } from "../services/service.mock";
import { makeProjectVersionLoader } from "../../src/io/project-version-io";

describe("project-version-io", () => {
  describe("load", () => {
    function makeDependencies() {
      const readFile = mockService<ReadTextFile>();

      const loadProjectVersion = makeProjectVersionLoader(readFile);

      return { loadProjectVersion, readFile } as const;
    }

    it("should fail if file could not be read", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      const expected = new FsError(
        "/some/path/ProjectVersion.txt",
        FsErrorReason.Other
      );
      readFile.mockReturnValue(Err(expected).toAsyncResult());

      const result = await loadProjectVersion("/some/bad/path").promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if file does not contain valid yaml", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      readFile.mockReturnValue(Ok("{ this is not valid yaml").toAsyncResult());

      const result = await loadProjectVersion("/some/path").promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(StringFormatError)
      );
    });

    it("should fail if yaml does not contain editor-version", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      readFile.mockReturnValue(
        Ok("thisIsYaml: but not what we want").toAsyncResult()
      );

      const result = await loadProjectVersion("/some/path").promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(FileParseError)
      );
    });

    it("should load valid version strings", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      const expected = "2022.1.2f1";
      readFile.mockReturnValue(
        Ok(`m_EditorVersion: ${expected}`).toAsyncResult()
      );

      const result = await loadProjectVersion("/some/path").promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });
  });
});
