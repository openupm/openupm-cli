import { describe } from "mocha";
import {
  isReverseDomainName,
  namespaceFor,
} from "../src/types/reverse-domain-name";
import should from "should";

describe("reverse-domain-name", function () {
  describe("namespace", function () {
    [
      ["unity.com", "com.unity"],
      ["my-school.ac.at", "at.ac.my-school"],
      ["openupm.com", "com.openupm"],
      ["registry.npmjs.org", "org.npmjs"],
    ].forEach(([hostName, expected]) =>
      it(`"${hostName}" should become "${expected}"`, function () {
        const actual = namespaceFor(hostName);
        should(actual).be.equal(expected);
      })
    );
  });
  describe("validation", function () {
    [
      "com.unity",
      "com.openupm",
      "at.ac.my-school",
      "dev.comradevanti123",
    ].forEach((s) =>
      it(`"${s}" should be reverse-domain-name`, () =>
        should(isReverseDomainName(s)).be.true())
    );
    [
      "",
      " ",
      // Single segments are not valid reverse-domain-names
      "com",
      // Invalid characters
      "com.x💀x",
      // No double hyphens
      "com.my--school",
      // No leading hyphens
      "com.-unity",
      // No trailing hyphens
      "com.unity-",
    ].forEach((s) =>
      it(`"${s}" should not be reverse-domain-name`, () =>
        should(isReverseDomainName(s)).be.false())
    );
  });
});
