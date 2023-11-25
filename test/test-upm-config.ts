import { describe } from "mocha";
import {
  Base64AuthData,
  decodeBasicAuth,
  encodeBasicAuth,
  isBasicAuth,
  isTokenAuth,
  UpmAuth,
} from "../src/types/upm-config";
import should from "should";

describe("upm-config", function () {
  describe("auth", function () {
    describe("classification", function () {
      it("should be basic auth if it has _auth property", () => {
        const auth: UpmAuth = {
          email: "real@email.com",
          alwaysAuth: true,
          // Not a real base64 string, but we don't care in this test
          _auth: "h8gz8s9zgseihgisejf" as Base64AuthData,
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
  });
});
