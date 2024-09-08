import path from "path";
import {
  determineCwd,
  determineIsSystemUser,
  determineLogLevel,
  determinePrimaryRegistryUrl,
  determineUseColor,
  determineUseUpstream,
} from "../../../src/cli/parse-env";
import { openupmRegistryUrl } from "../../../src/domain/registry-url";
import { exampleRegistryUrl } from "../../common/data-registry";

const testRootPath = "/users/some-user/projects/MyUnityProject";

describe("parse env", () => {
  describe("log-level", () => {
    it("should be verbose if verbose option is true", () => {
      const actual = determineLogLevel({
        verbose: true,
      });

      expect(actual).toEqual("verbose");
    });

    it("should be notice if verbose option is false", () => {
      const actual = determineLogLevel({
        verbose: false,
      });

      expect(actual).toEqual("notice");
    });

    it("should be notice if verbose option is missing", () => {
      const actual = determineLogLevel({});

      expect(actual).toEqual("notice");
    });
  });

  describe("color", () => {
    it("should use color if color option is true", () => {
      const actual = determineUseColor(
        {},
        {
          color: true,
        }
      );

      expect(actual).toBeTruthy();
    });

    it("should use color if color option is missing", () => {
      const actual = determineUseColor({}, {});

      expect(actual).toBeTruthy();
    });

    it("should not use color if color option is false", () => {
      const actual = determineUseColor(
        {},
        {
          color: false,
        }
      );

      expect(actual).toBeFalsy();
    });
  });

  describe("use upstream", () => {
    it("should use upstream if upstream option is true", () => {
      const actual = determineUseUpstream({
        upstream: true,
      });

      expect(actual).toBeTruthy();
    });

    it("should use upstream if upstream option is missing", () => {
      const actual = determineUseUpstream({});

      expect(actual).toBeTruthy();
    });

    it("should not use upstream if upstream option is false", () => {
      const actual = determineUseUpstream({
        upstream: false,
      });

      expect(actual).toBeFalsy();
    });
  });

  describe("system-user", () => {
    it("should be system-user if option is true", () => {
      const actual = determineIsSystemUser({
        systemUser: true,
      });

      expect(actual).toBeTruthy();
    });

    it("should not be system-user if option is missing", () => {
      const actual = determineIsSystemUser({});

      expect(actual).toBeFalsy();
    });

    it("should not be system-user if option is false", () => {
      const actual = determineIsSystemUser({
        systemUser: false,
      });

      expect(actual).toBeFalsy();
    });
  });

  describe("registry", () => {
    it("should be openupm by default", () => {
      const actual = determinePrimaryRegistryUrl({});

      expect(actual).toEqual(openupmRegistryUrl);
    });

    it("should be custom registry url if overridden", () => {
      const actual = determinePrimaryRegistryUrl({
        registry: exampleRegistryUrl,
      });

      expect(actual).toEqual(exampleRegistryUrl);
    });
  });

  describe("cwd", () => {
    it("should be process directory by default", () => {
      const actual = determineCwd(testRootPath, {});

      expect(actual).toEqual(testRootPath);
    });

    it("should be specified path if overridden", () => {
      const expected = path.resolve("/some/other/path");

      const actual = determineCwd(testRootPath, {
        chdir: expected,
      });

      expect(actual).toEqual(expected);
    });
  });
});
