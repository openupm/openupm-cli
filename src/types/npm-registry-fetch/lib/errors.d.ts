import {Response} from "node-fetch";

declare module "npm-registry-fetch/lib/errors" {
  export class HttpErrorBase extends Error {
    statusCode: Response["status"];
    code: `E${Response["status"]}}` | `E${string}`;
  }
}
