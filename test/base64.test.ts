import { decodeBase64, encodeBase64 } from "../src/types/base64";

describe("base 64", () => {
  it("should round-trip", () => {
    const expected = "some text";
    const encoded = encodeBase64(expected);
    const actual = decodeBase64(encoded);

    expect(actual).toEqual(expected);
  });
});
