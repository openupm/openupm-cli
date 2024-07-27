import { z } from "zod";

const segmentRegex = /^(?!.*--|^-.*|.*-$)[a-zA-Z0-9-]+$/;

function domainSegmentsIn(hostName: string): string[] {
  return hostName.split(".");
}

/**
 * Schema for {@link DomainName}.
 */
export const DomainName = z
  .string()
  .refine((s) => {
    const segments = domainSegmentsIn(s);
    if (segments.length === 0) return false;
    return segments.every((segment) => segmentRegex.test(segment));
  })
  .brand("DomainName");

/**
 * A string matching the format of a domain name.
 * @example com.unity
 * @example com.my-company
 */
export type DomainName = z.TypeOf<typeof DomainName>;
