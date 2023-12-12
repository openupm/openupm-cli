import { describe } from "mocha";
import {
  decodeBasicAuth,
  encodeBasicAuth,
  isBasicAuth,
  isTokenAuth,
  shouldAlwaysAuth,
  UpmAuth,
} from "../src/types/upm-config";
import should from "should";
import { Base64 } from "../src/types/base64";

describe("upm-config", function () {
  describe("auth", function () {
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
        const [actualUsername, actualPassword] = decodeBasicAuth(encoded);
        should(actualUsername).be.equal(expectedUsername);
        should(actualPassword).be.equal(expectedPassword);
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
  });
});
