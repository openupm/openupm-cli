import type { Registry } from "../../src/domain/registry.js";
import { RegistryUrl } from "../../src/domain/registry-url.js";

/**
 * Some registry url for testing.
 */
export const someRegistryUrl = RegistryUrl.parse("https://registry.some.com");

/**
 * Some registry for testing.
 */
export const someRegistry: Registry = { url: someRegistryUrl, auth: null };

/**
 * Some other registry url for testing. Different from {@link someRegistryUrl}.
 */
export const otherRegistryUrl = RegistryUrl.parse("https://registry.other.com");

/**
 * Some other registry for testing. Different from {@link someRegistry}.
 */
export const otherRegistry: Registry = { url: otherRegistryUrl, auth: null };
