import fetch from "node-fetch";

/**
 * Function for checking if an url exists.
 * @param url The url to check.
 * @returns A boolean indicating whether the url exists.
 */
export type CheckUrlExists = (url: string) => Promise<boolean>;

/**
 * Makes a {@link CheckUrlExists} function that determines whether a url
 * exists by checking whether it responds to a HEAD request with 200.
 */
export function CheckUrlIsOk(): CheckUrlExists {
  return async (url) => {
    const response = await fetch(url, { method: "HEAD" });
    return response.status === 200;
  };
}

/**
 * Default {@link CheckUrlExists} function. Uses {@link CheckUrlIsOk}.
 */
export const checkUrlExists: CheckUrlExists = CheckUrlIsOk();
