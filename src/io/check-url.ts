import { GenericNetworkError } from "./common-errors";
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
    try {
      const reponse = await fetch(url, { method: "HEAD" });
      if (reponse.status === 200) return true;
      else if (reponse.status === 404) return false;
      // noinspection ExceptionCaughtLocallyJS
      throw new GenericNetworkError();
    } catch (error) {
      if (error instanceof GenericNetworkError) throw error;
      throw new GenericNetworkError();
    }
  };
}
