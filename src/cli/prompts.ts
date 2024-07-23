import promptly from "promptly";
import { makeRegistryUrl, RegistryUrl } from "../domain/registry-url";

/**
 * Prompts the user for their username.
 * @returns The username.
 */
export function promptUsername(): Promise<string> {
  return promptly.prompt("Username: ");
}

/**
 * Prompts the user for their password.
 * @returns The password.
 */
export function promptPassword(): Promise<string> {
  return promptly.password("Password: ");
}

/**
 * Prompts the user for their email.
 * @returns The email.
 */
export function promptEmail(): Promise<string> {
  return promptly.prompt("Email: ");
}

/**
 * Prompts the user for a registry url.
 * @returns The url.
 */
export function promptRegistryUrl(): Promise<RegistryUrl> {
  return promptly.prompt("Registry: ", {
    validator: [makeRegistryUrl],
  }) as Promise<RegistryUrl>;
}
