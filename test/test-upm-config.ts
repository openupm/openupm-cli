import {
  addAuth,
  BasicAuth,
  encodeBasicAuth,
  isBasicAuth,
  isTokenAuth,
  shouldAlwaysAuth,
  tryDecodeBasicAuth,
  tryGetAuthForRegistry,
  tryToNpmAuth,
  UpmAuth,
  UPMConfig,
} from "../src/types/upm-config";
import should from "should";
import { Base64 } from "../src/types/base64";
import { registryUrl, RegistryUrl } from "../src/types/registry-url";
import { NpmAuth } from "another-npm-registry-client";
import { exampleRegistryUrl } from "./mock-registry";

describe("upm-config", function () {
  describe("auth", function () {
    describe("add", function () {
      it("should have registry after adding", function () {
        const registry = exampleRegistryUrl;
        const auth: BasicAuth = {
          email: "email@wow.com",
          _auth: encodeBasicAuth("user", "pass"),
        };
        const config = addAuth(registry, auth, {});
        should(tryGetAuthForRegistry(config, registry)).be.deepEqual(
          tryToNpmAuth(auth)
        );
      });
    });
    describe("classification", function () {
      it("should be basic auth if it has _auth property", () => {
        const auth: UpmAuth = {
          email: "real@email.com",
          alwaysAuth: true,
          // Not a real base64 string, but we don't care in this test
          _auth: "h8gz8s9zgseihgisejf" as Base64,
        };
        should(isBasicAuth(auth)).be.true();
      });
      it("should be token auth if it has token property", () => {
        const auth: UpmAuth = {
          email: "real@email.com",
          alwaysAuth: true,
          // Not a real token, but we don't care in this test
          token: "h8gz8s9zgseihgisejf",
        };
        should(isTokenAuth(auth)).be.true();
      });
    });
    describe("encode/decode", function () {
      it("should decode the same basic auth as was encoded", () => {
        const expectedUsername = "my-name";
        const expectedPassword = "123pass";
        const encoded = encodeBasicAuth(expectedUsername, expectedPassword);
        const [actualUsername, actualPassword] = tryDecodeBasicAuth(encoded)!;
        should(actualUsername).be.equal(expectedUsername);
        should(actualPassword).be.equal(expectedPassword);
      });
      it("should not decode invalid data", () => {
        const encoded = "This is not valid data" as Base64;
        const decoded = tryDecodeBasicAuth(encoded)!;
        should(decoded).be.null();
      });
    });
    describe("always-auth", function () {
      it("should always-auth when prop is true", () => {
        const auth: UpmAuth = {
          email: "real@email.com",
          alwaysAuth: true,
          // Not a real base64 string, but we don't care in this test
          _auth: "h8gz8s9zgseihgisejf" as Base64,
        };
        should(shouldAlwaysAuth(auth)).be.true();
      });
      it("should not always-auth when prop is false", () => {
        const auth: UpmAuth = {
          email: "real@email.com",
          alwaysAuth: false,
          // Not a real base64 string, but we don't care in this test
          _auth: "h8gz8s9zgseihgisejf" as Base64,
        };
        should(shouldAlwaysAuth(auth)).be.false();
      });
      it("should not always-auth when prop is missing", () => {
        const auth: UpmAuth = {
          email: "real@email.com",
          // Not a real base64 string, but we don't care in this test
          _auth: "h8gz8s9zgseihgisejf" as Base64,
        };
        should(shouldAlwaysAuth(auth)).be.false();
      });
    });
    describe("get auth for registry", function () {
      it("should find auth for url without trailing slash", function () {
        const url = registryUrl("http://registry.npmjs.com");
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
        should(actual).be.deepEqual(expected);
      });
      it("should find auth for url with trailing slash", function () {
        const url = "http://registry.npmjs.com/" as RegistryUrl;
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
        should(actual).be.deepEqual(expected);
      });
      it("should not find auth for url that does not exist", function () {
        const config: UPMConfig = {
          npmAuth: {
            ["http://registryA.com"]: {
              alwaysAuth: false,
              email: "real@email.com",
              token: "This is not a valid token",
            },
          },
        };

        const actual = tryGetAuthForRegistry(
          config,
          registryUrl("http://registryB.com")
        );
        should(actual).be.null();
      });
    });
  });
});
