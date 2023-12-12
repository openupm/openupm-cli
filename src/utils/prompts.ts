import promptly from "promptly";
import { registryUrl, RegistryUrl } from "../types/registry-url";

export function promptUsername(): Promise<string> {
  return promptly.prompt("Username: ");
}

export function promptPassword(): Promise<string> {
  return promptly.password("Password: ");
}

export function promptEmail(): Promise<string> {
  return promptly.prompt("Email: ");
}

export function promptRegistryUrl(): Promise<RegistryUrl> {
  return promptly.prompt("Registry: ", {
    validator: [registryUrl],
  }) as Promise<RegistryUrl>;
}