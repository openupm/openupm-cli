import {
  ProjectVersionMalformedError,
  ProjectVersionMissingError,
  ReadProjectVersionFile,
} from "../../src/io/project-version-io";
import { ReadTextFile } from "../../src/io/text-file-io";
import { noopLogger } from "../../src/logging";
import { mockService } from "../services/service.mock";

describe("project-version-io", () => {
  describe("read file", () => {
    function makeDependencies() {
      const readFile = mockService<ReadTextFile>();

      const readProjectVersionFile = ReadProjectVersionFile(
        readFile,
        noopLogger
      );

      return { readProjectVersionFile, readFile } as const;
    }

    it("should fail if file is missing", async () => {
      const { readProjectVersionFile, readFile } = makeDependencies();
      readFile.mockResolvedValue(null);

      await expect(
        readProjectVersionFile("/some/bad/path")
      ).rejects.toBeInstanceOf(ProjectVersionMissingError);
    });

    it("should fail if file does not contain valid yaml", async () => {
      const { readProjectVersionFile, readFile } = makeDependencies();
      readFile.mockResolvedValue("this\\ is { not } : yaml");

      await expect(readProjectVersionFile("/some/path")).rejects.toBeInstanceOf(
        ProjectVersionMalformedError
      );
    });

    it("should fail if yaml does not contain editor-version", async () => {
      const { readProjectVersionFile, readFile } = makeDependencies();
      readFile.mockResolvedValue("thisIsYaml: but not what we want");

      await expect(readProjectVersionFile("/some/path")).rejects.toBeInstanceOf(
        ProjectVersionMalformedError
      );
    });

    it("should load valid version strings", async () => {
      const { readProjectVersionFile, readFile } = makeDependencies();
      const expected = "2022.1.2f1";
      readFile.mockResolvedValue(`m_EditorVersion: ${expected}`);

      const actual = await readProjectVersionFile("/some/path");

      expect(actual).toEqual(expected);
    });
  });
});
