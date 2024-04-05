import path from "path";
import { tryGetEnv } from "../src/utils/env-util";
import { tryGetHomePath } from "../src/io/home";

jest.mock("../src/utils/env-util");

describe("home path", () => {
  it("should be USERPROFILE if defined", () => {
    const expected = path.join(path.sep, "user", "dir");
    jest
      .mocked(tryGetEnv)
      .mockImplementation((key) => (key === "USERPROFILE" ? expected : null));

    const result = tryGetHomePath();

    expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
  });

  it("should be HOME if USERPROFILE is not defined", () => {
    const expected = path.join(path.sep, "user", "dir");
    jest
      .mocked(tryGetEnv)
      .mockImplementation((key) => (key === "HOME" ? expected : null));

    const result = tryGetHomePath();

    expect(result).toBeOk((actual) => expect(actual).toEqual(expected));
  });

  it("should fail if HOME and USERPROFILE are not defined", () => {
    jest.mocked(tryGetEnv).mockReturnValue(null);

    const result = tryGetHomePath();

    expect(result).toBeError();
  });
});
