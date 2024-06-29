import { isDomainName } from "../../src/domain/domain-name";

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
});
