import { Option } from "@commander-js/extra-typings";

/**
 * CLI option for the working directory.
 *
 * Defaults to {@link process.cwd}.
 */
export const workDirOpt = new Option(
  // Should probably be something like "--wd" but left as is for compatibilty
  "-c, --chdir <path>",
  "change the working directory"
).default(process.cwd());
