import {
  isDomainName,
  isInternalPackage,
  makeDomainName,
} from "../../src/domain/domain-name";

describe("domain-name", () => {
  describe("validation", () => {
    it.each([
      "com",
      "com.unity",
      "com.openupm",
      "at.ac.my-school",
      "dev.comradevanti123",
    ])(`should be ok for "%s"`, (s) => {
      expect(isDomainName(s)).toBeTruthy();
    });

    it.each([
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
    ])(`should not be ok for "%s"`, (s) => {
      expect(isDomainName(s)).toBeFalsy();
    });
  });

  describe("internal package", () => {
    it("test com.otherorg.software", () => {
      expect(
        isInternalPackage(makeDomainName("com.otherorg.software"))
      ).not.toBeTruthy();
    });
    it("test com.unity.ugui", () => {
      expect(isInternalPackage(makeDomainName("com.unity.ugui"))).toBeTruthy();
    });
    it("test com.unity.modules.tilemap", () => {
      expect(
        isInternalPackage(makeDomainName("com.unity.modules.tilemap"))
      ).toBeTruthy();
    });
  });
});
