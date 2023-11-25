import { Registry } from "./global";

/**
 * Authentication information for a registry
 */
export type UpmAuth = {
  /**
   * The email to use
   */
  email: string;
  /**
   * Whether to always authenticate
   */
  alwaysAuth: boolean;
} & (
  | {
      /**
       * A token to authenticate with
       */
      token: string;
    }
  | {
      /**
       * Base64 encoded username and password to authenticate with
       */
      _auth: string;
    }
);

/**
 * Content of .upmconfig.toml. Used to authenticate with package registries
 * @see https://medium.com/openupm/how-to-authenticate-with-a-upm-scoped-registry-using-cli-afc29c13a2f8
 */
export type UPMConfig = {
  /**
   * Authentication information organized by the registry they should be used on
   */
  npmAuth?: Record<Registry, UpmAuth>;
};
