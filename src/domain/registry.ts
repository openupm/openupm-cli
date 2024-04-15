import { RegistryUrl } from "./registry-url";
import { NpmAuth } from "another-npm-registry-client";

export type Registry = Readonly<{
  url: RegistryUrl;
  auth: NpmAuth | null;
}>;
