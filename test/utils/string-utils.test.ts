import { splitLines } from "../../src/utils/string-utils";

describe("string utils", () => {
  describe("split into lines", () => {
    it("should work for any linebreak string", () => {
      const content = "A\nB\r\nC\rD";
      const lines = splitLines(content);
      expect(lines).toEqual(["A", "B", "C", "D"]);
    });

    it("should remove empty lines", () => {
      const content = "A\n\n\n\nB";
      const lines = splitLines(content);
      expect(lines).toEqual(["A", "B"]);
    });
  });
});
