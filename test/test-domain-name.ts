import { describe } from "mocha";
import {
  domainName,
  isDomainName,
  isInternalPackage,
  namespaceFor,
} from "../src/types/domain-name";
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
  describe("internal package", function () {
    it("test com.otherorg.software", function () {
      isInternalPackage(domainName("com.otherorg.software")).should.not.be.ok();
    });
    it("test com.unity.ugui", function () {
      isInternalPackage(domainName("com.unity.ugui")).should.be.ok();
    });
    it("test com.unity.modules.tilemap", function () {
      isInternalPackage(domainName("com.unity.modules.tilemap")).should.be.ok();
    });
  });
});
