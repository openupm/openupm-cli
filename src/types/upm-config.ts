import { Registry } from "./global";

export type UpmAuth = {
  email: string;
  alwaysAuth: boolean;
} & ({ token: string } | { _auth: string });

export type UPMConfig = {
  npmAuth?: Record<Registry, UpmAuth>;
};
