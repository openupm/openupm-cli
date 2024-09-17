import { Option } from "@commander-js/extra-typings";

/**
 * CLI option for determining whether to fallback to the Unity registry.
 */
export const upstreamOpt = new Option(
  "--no-upstream",
  "don't use upstream unity registry"
).default(true);
