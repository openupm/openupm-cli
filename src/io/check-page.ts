import { AsyncResult, Err, Ok, Result } from "ts-results-es";
import { GenericNetworkError } from "./common-errors";

export type CheckPage = (
  url: string
) => AsyncResult<boolean, GenericNetworkError>;

export function makeCheckPage(): CheckPage {
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
