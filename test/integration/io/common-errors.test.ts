import {
  makeRegistryInteractionError,
  HttpErrorLike,
  RegistryAuthenticationError,
} from "../../../src/io/common-errors";
import { exampleRegistryUrl } from "../../unit/domain/data-registry";

describe("common error utilities", () => {
  describe("make registry interaction errors", () => {
    it("should be original error if not a http error", () => {
      const error = new Error("Not http");

      const actual = makeRegistryInteractionError(
        error,
        exampleRegistryUrl
      );

      expect(actual).toEqual(error);
    });

    it("should be original error if not a 401 error", () => {
      const error: HttpErrorLike = {
        name: "Some error",
        message: "Http error",
        statusCode: 404,
      };

      const actual = makeRegistryInteractionError(
        error,
        exampleRegistryUrl
      );

      expect(actual).toEqual(error);
    });

    it("should be auth error if 401 error", () => {
      const error: HttpErrorLike = {
        name: "Some error",
        message: "Http error",
        statusCode: 401,
      };

      const actual = makeRegistryInteractionError(
        error,
        exampleRegistryUrl
      );

      expect(actual).toBeInstanceOf(RegistryAuthenticationError);
    });
  });
});
