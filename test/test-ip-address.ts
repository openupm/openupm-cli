import { describe } from "mocha";
import { isIpAddress } from "../src/types/ip-address";
import should from "should";

describe("ip-address", function () {
  describe("validate", function () {
    [
      "10.20.30.40",
      "64.233.160.0",
      "2001:0db8:85a3:0000:0000:8a2e:0370:7334",
    ].forEach((s) =>
      it(`"${s}" should be ip-address`, () => should(isIpAddress(s)).be.true())
    );

    [
      "",
      " ",
      "hello",
      // Missing 4th segment
      "64.233.160",
      // Deleted some colons
      "2001:0db8:85a30000:0000:8a2e0370:7334",
    ].forEach((s) =>
      it(`"${s}" should not be ip-address`, () =>
        should(isIpAddress(s)).be.false())
    );
  });
});
