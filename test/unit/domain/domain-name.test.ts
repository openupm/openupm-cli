import { isZod } from "../../../src/domain/zod-utils";
import { DomainName } from "../../../src/domain/domain-name";

describe("domain-name", () => {
  describe("validation", () => {
    it.each([
      "com",
      "com.unity",
      "com.openupm",
      "at.ac.my-school",
      "dev.comradevanti123",
      "org.nuget.sqlitepclraw.bundle_e_sqlite3",
    ])(`should be ok for "%s"`, (s) => {
      expect(isZod(s, DomainName)).toBeTruthy();
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
      expect(isZod(s, DomainName)).toBeFalsy();
    });
  });
});
