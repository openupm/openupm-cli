import {
  makeRegistryInteractionError,
  HttpErrorLike,
  RegistryAuthenticationError,
} from "../../../src/io/common-errors.js";
import { someRegistryUrl } from "../../common/data-registry.js";

describe("common error utilities", () => {
  describe("make registry interaction errors", () => {
    it("should be original error if not a http error", () => {
      const error = new Error("Not http");

      const actual = makeRegistryInteractionError(
        error,
        someRegistryUrl
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
        someRegistryUrl
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
        someRegistryUrl
      );

      expect(actual).toBeInstanceOf(RegistryAuthenticationError);
    });
  });
});
