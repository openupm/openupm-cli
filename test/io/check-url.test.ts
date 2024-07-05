import { makeCheckUrlExists } from "../../src/io/check-url";
import fetch, { Response } from "node-fetch";

jest.mock("node-fetch");

describe("check url exists", () => {
  function makeDependencies() {
    const checkUrlExists = makeCheckUrlExists();
    return { checkUrlExists } as const;
  }

  it("should be true if url responds with 200", async () => {
    jest.mocked(fetch).mockResolvedValue({
      status: 200,
    } as Response);
    const { checkUrlExists } = makeDependencies();

    const actual = await checkUrlExists("https://some.url.com");

    expect(actual).toBeTruthy();
  });

  it.each([100, 201, 301, 401, 404, 500])(
    "should be false other status codes (%d)",
    async (statusCode) => {
      jest.mocked(fetch).mockResolvedValue({
        status: statusCode,
      } as Response);
      const { checkUrlExists } = makeDependencies();

      const actual = await checkUrlExists("https://some.url.com");

      expect(actual).toBeFalsy();
    }
  );
});
