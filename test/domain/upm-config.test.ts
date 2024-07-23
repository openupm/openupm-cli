import {
  addAuth,
  BasicAuth,
  encodeBasicAuth,
  isBasicAuth,
  isTokenAuth,
  shouldAlwaysAuth,
  toNpmAuth,
  tryDecodeBasicAuth,
  tryGetAuthForRegistry,
  UpmAuth,
  UPMConfig,
} from "../../src/domain/upm-config";
import { Base64 } from "../../src/domain/base64";
import { makeRegistryUrl, RegistryUrl } from "../../src/domain/registry-url";
import { NpmAuth } from "another-npm-registry-client";

import { exampleRegistryUrl } from "./data-registry";

describe("upm-config", () => {
  describe("auth", () => {
    describe("add", () => {
      it("should have registry after adding", () => {
        const registry = exampleRegistryUrl;
        const auth: BasicAuth = {
          email: "email@wow.com",
          _auth: encodeBasicAuth("user", "pass"),
        };
        const config = addAuth(registry, auth, {});
        expect(tryGetAuthForRegistry(config, registry)).toEqual(
          toNpmAuth(auth)
        );
      });
    });
    describe("classification", () => {
      it("should be basic auth if it has _auth property", () => {
        const auth: UpmAuth = {
          email: "real@email.com",
          alwaysAuth: true,
          // Not a real base64 string, but we don't care in this test
          _auth: "h8gz8s9zgseihgisejf" as Base64,
        };
        expect(isBasicAuth(auth)).toBeTruthy();
      });
      it("should be token auth if it has token property", () => {
        const auth: UpmAuth = {
          email: "real@email.com",
          alwaysAuth: true,
          // Not a real token, but we don't care in this test
          token: "h8gz8s9zgseihgisejf",
        };
        expect(isTokenAuth(auth)).toBeTruthy();
      });
    });
    describe("encode/decode", () => {
      it("should decode the same basic auth as was encoded", () => {
        const expectedUsername = "my-name";
        const expectedPassword = "123pass";
        const encoded = encodeBasicAuth(expectedUsername, expectedPassword);
        const [actualUsername, actualPassword] = tryDecodeBasicAuth(encoded)!;
        expect(actualUsername).toEqual(expectedUsername);
        expect(actualPassword).toEqual(expectedPassword);
      });
      it("should not decode invalid data", () => {
        const encoded = "This is not valid data" as Base64;
        const decoded = tryDecodeBasicAuth(encoded)!;
        expect(decoded).toBeNull();
      });
    });
    describe("always-auth", () => {
      it("should always-auth when prop is true", () => {
        const auth: UpmAuth = {
          email: "real@email.com",
          alwaysAuth: true,
          // Not a real base64 string, but we don't care in this test
          _auth: "h8gz8s9zgseihgisejf" as Base64,
        };
        expect(shouldAlwaysAuth(auth)).toBeTruthy();
      });
      it("should not always-auth when prop is false", () => {
        const auth: UpmAuth = {
          email: "real@email.com",
          alwaysAuth: false,
          // Not a real base64 string, but we don't care in this test
          _auth: "h8gz8s9zgseihgisejf" as Base64,
        };
        expect(shouldAlwaysAuth(auth)).toBeFalsy();
      });
      it("should not always-auth when prop is missing", () => {
        const auth: UpmAuth = {
          email: "real@email.com",
          // Not a real base64 string, but we don't care in this test
          _auth: "h8gz8s9zgseihgisejf" as Base64,
        };
        expect(shouldAlwaysAuth(auth)).toBeFalsy();
      });
    });
    describe("get auth for registry", () => {
      it("should find auth for url without trailing slash", () => {
        const url = makeRegistryUrl("https://registry.npmjs.com");
        const expected: NpmAuth = {
          alwaysAuth: false,
          token: "This is not a valid token",
        };
        const config: UPMConfig = {
          npmAuth: {
            [url]: {
              alwaysAuth: expected.alwaysAuth,
              email: "real@email.com",
              token: expected.token,
            },
          },
        };

        const actual = tryGetAuthForRegistry(config, url);
        expect(actual).toEqual(expected);
      });
      it("should find auth for url with trailing slash", () => {
        const url = "https://registry.npmjs.com/" as RegistryUrl;
        const expected: NpmAuth = {
          alwaysAuth: false,
          token: "This is not a valid token",
        };
        const config: UPMConfig = {
          npmAuth: {
            [url]: {
              alwaysAuth: expected.alwaysAuth,
              email: "real@email.com",
              token: expected.token,
            },
          },
        };

        const actual = tryGetAuthForRegistry(config, url);
        expect(actual).toEqual(expected);
      });
      it("should not find auth for url that does not exist", () => {
        const config: UPMConfig = {
          npmAuth: {
            ["https://registryA.com"]: {
              alwaysAuth: false,
              email: "real@email.com",
              token: "This is not a valid token",
            },
          },
        };

        const actual = tryGetAuthForRegistry(
          config,
          makeRegistryUrl("https://registryB.com")
        );
        expect(actual).toBeNull();
      });
    });
  });
});
