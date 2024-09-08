import { z } from "zod";

/**
 * Zod parser for {@link Base64}.
 */
export const Base64 = z.string().base64().brand("Base64");

/**
 * A Base64 encoded string.
 */
export type Base64 = z.TypeOf<typeof Base64>;

/**
 * Encodes a string using base64.
 * @param s The string.
 */
export function encodeBase64(s: string): Base64 {
  return Buffer.from(s).toString("base64") as Base64;
}

/**
 * Decodes a base64 string.
 * @param base64 The string.
 */
export function decodeBase64(base64: Base64): string {
  const buffer = Buffer.from(base64, "base64");
  return buffer.toString("utf-8");
}
