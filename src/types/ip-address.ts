import { Brand } from "ts-brand";
import net from "node:net";

/**
 * A string that is either a valid v4 or v6 ip-address
 */
export type IpAddress = Brand<string, "IpAddress">;

/**
 * Checks if a string is valid {@link IpAddress}
 * @param s The string
 */
export function isIpAddress(s: string): s is IpAddress {
  return net.isIPv4(s) || net.isIPv6(s);
}
