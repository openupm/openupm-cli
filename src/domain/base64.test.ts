import { decodeBase64, encodeBase64 } from "./base64";
import fc from "fast-check";

describe("base 64", () => {
  it("should round-trip", () => {
    fc.assert(
      fc.property(fc.string(), (expected) => {
        const encoded = encodeBase64(expected);
        const actual = decodeBase64(encoded);

        expect(actual).toEqual(expected);
      })
    );
  });
});
