import { Option } from "@commander-js/extra-typings";
import { openupmRegistryUrl } from "../domain/registry-url";
import { mustBeRegistryUrl } from "./validators";

/**
 * CLI option for the primary registry from which to resolve packages.
 * Defaults to {@link openupmRegistryUrl}.
 */
export const primaryRegistryUrlOpt = new Option(
  "-r, --registry <url>",
  "specify registry url"
)
  .argParser(mustBeRegistryUrl)
  .default(openupmRegistryUrl, "Use the openupm registry by default");
