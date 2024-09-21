import { Option } from "@commander-js/extra-typings";
import { openupmRegistryUrl } from "../domain/registry-url";
import { eachValue } from "./cli-parsing";
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

/**
 * CLI option for multiple primary registries from which to resolve packages.
 */
export const primaryRegistriesUrlOpt = new Option(
  "-r, --registry <url...>",
  "specify registry url"
).argParser(eachValue(mustBeRegistryUrl));
