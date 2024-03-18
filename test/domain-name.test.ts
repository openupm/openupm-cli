import {
  isDomainName,
  isInternalPackage,
  makeDomainName,
} from "../src/types/domain-name";

describe("domain-name", () => {
  describe("validation", () => {
    [
      "com",
      "com.unity",
      "com.openupm",
      "at.ac.my-school",
      "dev.comradevanti123",
    ].forEach((s) =>
      it(`"${s}" should be domain-name`, () => {
        expect(isDomainName(s)).toBeTruthy();
      })
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
      it(`"${s}" should not be domain-name`, () => {
        expect(isDomainName(s)).toBeFalsy();
      })
    );
  });
  describe("internal package", () => {
    it("test com.otherorg.software", function () {
      expect(
        isInternalPackage(makeDomainName("com.otherorg.software"))
      ).not.toBeTruthy();
    });
    it("test com.unity.ugui", function () {
      expect(isInternalPackage(makeDomainName("com.unity.ugui"))).toBeTruthy();
    });
    it("test com.unity.modules.tilemap", function () {
      expect(
        isInternalPackage(makeDomainName("com.unity.modules.tilemap"))
      ).toBeTruthy();
    });
  });
});
