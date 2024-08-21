import fetch, { Response } from "node-fetch";
import { CheckUrlIsOk } from "../../../src/io/check-url";

jest.mock("node-fetch");

describe("check url is ok", () => {
  function makeDependencies() {
    const checkUrlIsOk = CheckUrlIsOk();
    return { checkUrlIsOk } as const;
  }

  it("should be true if url responds with 200", async () => {
    jest.mocked(fetch).mockResolvedValue({
      status: 200,
    } as Response);
    const { checkUrlIsOk } = makeDependencies();

    const actual = await checkUrlIsOk("https://some.url.com");

    expect(actual).toBeTruthy();
  });

  it.each([100, 201, 301, 401, 404, 500])(
    "should be false other status codes (%d)",
    async (statusCode) => {
      jest.mocked(fetch).mockResolvedValue({
        status: statusCode,
      } as Response);
      const { checkUrlIsOk } = makeDependencies();

      const actual = await checkUrlIsOk("https://some.url.com");

      expect(actual).toBeFalsy();
    }
  );
});
