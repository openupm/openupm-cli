import { ReadTextFile } from "../../src/io/text-file-io";
import { mockService } from "../services/service.mock";
import {
  makeLoadProjectVersion,
  ProjectVersionMalformedError,
  ProjectVersionMissingError,
} from "../../src/io/project-version-io";
import { noopLogger } from "../../src/logging";

describe("project-version-io", () => {
  describe("load", () => {
    function makeDependencies() {
      const readFile = mockService<ReadTextFile>();

      const loadProjectVersion = makeLoadProjectVersion(readFile, noopLogger);

      return { loadProjectVersion, readFile } as const;
    }

    it("should fail if file is missing", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      readFile.mockResolvedValue(null);

      await expect(loadProjectVersion("/some/bad/path")).rejects.toBeInstanceOf(
        ProjectVersionMissingError
      );
    });

    it("should fail if file does not contain valid yaml", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      readFile.mockResolvedValue("this\\ is { not } : yaml");

      await expect(loadProjectVersion("/some/path")).rejects.toBeInstanceOf(
        ProjectVersionMalformedError
      );
    });

    it("should fail if yaml does not contain editor-version", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      readFile.mockResolvedValue("thisIsYaml: but not what we want");

      await expect(loadProjectVersion("/some/path")).rejects.toBeInstanceOf(
        ProjectVersionMalformedError
      );
    });

    it("should load valid version strings", async () => {
      const { loadProjectVersion, readFile } = makeDependencies();
      const expected = "2022.1.2f1";
      readFile.mockResolvedValue(`m_EditorVersion: ${expected}`);

      const actual = await loadProjectVersion("/some/path");

      expect(actual).toEqual(expected);
    });
  });
});
