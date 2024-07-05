import fetch from "node-fetch";

/**
 * Function for checking if an url exists.
 * @param url The url to check.
 * @returns A boolean indicating whether the url exists.
 */
export type CheckUrlExists = (url: string) => Promise<boolean>;

/**
 * Makes a {@link CheckUrlExists} function.
 */
export function makeCheckUrlExists(): CheckUrlExists {
  return async (url) => {
    const response = await fetch(url, { method: "HEAD" });
    return response.status === 200;
  };
}
