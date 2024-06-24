import { makeCheckUrlExists } from "../../src/io/check-url";
import fetch, { Response } from "node-fetch";
import { GenericNetworkError } from "../../src/io/common-errors";

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

    const result = await checkUrlExists("https://some.url.com").promise;

    expect(result).toBeOk((actual) => expect(actual).toBeTruthy());
  });

  it("should be false if url responds with 404", async () => {
    jest.mocked(fetch).mockResolvedValue({
      status: 404,
    } as Response);
    const { checkUrlExists } = makeDependencies();

    const result = await checkUrlExists("https://some.url.com").promise;

    expect(result).toBeOk((actual) => expect(actual).toBeFalsy());
  });

  it.each([100, 201, 301, 401, 500])(
    "should be fail for other status codes (%d)",
    async (statusCode) => {
      jest.mocked(fetch).mockResolvedValue({
        status: statusCode,
      } as Response);
      const { checkUrlExists } = makeDependencies();

      const result = await checkUrlExists("https://some.url.com").promise;

      expect(result).toBeError((actual) =>
        expect(actual).toBeInstanceOf(GenericNetworkError)
      );
    }
  );

  it("should be fail if request fails", async () => {
    jest.mocked(fetch).mockRejectedValueOnce(new Error("Network bad"));
    const { checkUrlExists } = makeDependencies();

    const result = await checkUrlExists("https://some.url.com").promise;

    expect(result).toBeError((actual) =>
      expect(actual).toBeInstanceOf(GenericNetworkError)
    );
  });
});
