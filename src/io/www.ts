import fetch from "node-fetch";

/**
 * Function for checking if an url exists.
 * @param url The url to check.
 * @returns A boolean indicating whether the url exists.
 */
export type CheckUrlExists = (url: string) => Promise<boolean>;

/**
 * {@link CheckUrlExists} function which uses {@link fetch} to send a
 * `HEAD` request to the url and checks whether it is `ok`.
 */
export const fetchCheckUrlExists: CheckUrlExists = async (url) => {
  const response = await fetch(url, { method: "HEAD" });
  return response.ok;
};
