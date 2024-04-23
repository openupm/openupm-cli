import * as fileIoModule from "../src/io/file-io";
import { NotFoundError } from "../src/io/file-io";
import { Err, Ok } from "ts-results-es";
import { FileParseError } from "../src/common-errors";
import { tryLoadProjectVersion } from "../src/io/project-version-io";
import { StringFormatError } from "../src/utils/string-parsing";

describe("project-version-io", () => {
  describe("load", () => {
    it("should fail if file could not be read", async () => {
      const expected = new NotFoundError("/some/path/ProjectVersion.txt");
      jest
        .spyOn(fileIoModule, "tryReadTextFromFile")
        .mockReturnValue(Err(expected).toAsyncResult());

      const result = await tryLoadProjectVersion("/some/bad/path").promise;

      expect(result).toBeError((actual) => expect(actual).toEqual(expected));
    });

    it("should fail if file does not contain valid yaml", async () => {
      jest
        .spyOn(fileIoModule, "tryReadTextFromFile")
        .mockReturnValue(Ok("{ this is not valid yaml").toAsyncResult());

      const result = await tryLoadProjectVersion("/some/path").promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(StringFormatError)
      );
    });

    it("should fail if yaml does not contain editor-version", async () => {
      jest
        .spyOn(fileIoModule, "tryReadTextFromFile")
        .mockReturnValue(
          Ok("thisIsYaml: but not what we want").toAsyncResult()
        );

      const result = await tryLoadProjectVersion("/some/path").promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(FileParseError)
      );
    });

    it("should load valid version strings", async () => {
      const expected = "2022.1.2f1";
      jest
        .spyOn(fileIoModule, "tryReadTextFromFile")
        .mockReturnValue(Ok(`m_EditorVersion: ${expected}`).toAsyncResult());

      const result = await tryLoadProjectVersion("/some/path").promise;

      expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
    });
  });
});
