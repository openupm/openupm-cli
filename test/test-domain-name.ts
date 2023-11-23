import { describe } from "mocha";
import { isDomainName, namespaceFor } from "../src/types/domain-name";
import should from "should";

describe("domain-name", function () {
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
      "com",
      "com.unity",
      "com.openupm",
      "at.ac.my-school",
      "dev.comradevanti123",
    ].forEach((s) =>
      it(`"${s}" should be domain-name`, () =>
        should(isDomainName(s)).be.true())
    );
    [
      "",
      " ",
      // Invalid characters
      "com.x💀x",
      // No double hyphens
      "com.my--school",
      // No leading hyphens
      "com.-unity",
      // No trailing hyphens
      "com.unity-",
    ].forEach((s) =>
      it(`"${s}" should not be domain-name`, () =>
        should(isDomainName(s)).be.false())
    );
  });
});
