import { Option } from "@commander-js/extra-typings";

/**
 * CLI option of whether to authenticate using the system user instead of
 * the local windows user.
 */
export const systemUserOpt = new Option(
  "--system-user",
  "auth for Windows system user"
).default(false);
