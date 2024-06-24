import { AsyncResult, Err, Ok, Result } from "ts-results-es";
import { GenericNetworkError } from "./common-errors";

/**
 * Function for checking if an url exists.
 * @param url The url to check.
 */
export type CheckUrlExists = (
  url: string
) => AsyncResult<boolean, GenericNetworkError>;

/**
 * Makes a {@link CheckUrlExists} function.
 */
export function makeCheckUrlExists(): CheckUrlExists {
  return (url) => {
    return new AsyncResult(
      Result.wrapAsync(() => fetch(url, { method: "HEAD" }))
    )
      .mapErr(() => new GenericNetworkError())
      .andThen((reponse) => {
        if (reponse.status === 200) return Ok(true);
        else if (reponse.status === 404) return Ok(false);
        else return Err(new GenericNetworkError());
      });
  };
}
