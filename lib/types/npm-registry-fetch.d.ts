declare module "npm-registry-fetch" {
  declare class HttpErrorBase extends Error {
    statusCode: Response["status"];
    code: `E${Response["status"]}}` | `E${string}`;
  }
}
