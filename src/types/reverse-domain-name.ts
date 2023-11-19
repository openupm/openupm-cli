import { Brand } from "ts-brand";

/**
 * A string matching the format of a reverse domain name.
 * @example com.unity
 * @example com.my-company
 */
export type ReverseDomainName = Brand<string, "ReverseDomainName">;

const segmentRegex = /^(?!.*--)[^-][a-zA-Z0-9-]{0,20}[^-]$/;

export const openUpmReverseDomainName = "com.openupm" as ReverseDomainName;

function domainSegmentsIn(hostName: string): string[] {
  return hostName.split(".");
}

/**
 * Creates a namespace by reversing the TDL of a host-name.
 * @param hostname The host-name to reverse.
 * @example unity.com becomes com.unity.
 * @example registry.npmjs.org becomes org.npmjs.
 * @example my-school.ac.at becomes at.ac.my-school
 */
export function namespaceFor(hostname: string): ReverseDomainName {
  const segments = domainSegmentsIn(hostname);
  const namespaceSegments = (function () {
    const count = segments.length;

    /* 
    NOTE: This function does not handle domains with longer extensions
    such as registry.example.team.com. In this case it would incorrectly only
    return "com.team" even though "example" is also part of the domain.
    Let's just hope this does not happen for now 🤞
    */

    // 2-part domains, like unity.com
    if (count < 3) return segments;
    // Domains with two short extensions like my-school.ac.at
    if (segments[count - 1].length <= 3 && segments[count - 2].length <= 3)
      return segments.slice(count - 3);
    // Domains with one extension such as registry.npmjs.org
    return segments.slice(count - 2);
  })();
  return namespaceSegments.reverse().join(".") as ReverseDomainName;
}

export function isReverseDomainName(s: string): s is ReverseDomainName {
  const segments = domainSegmentsIn(s);
  if (segments === null || segments.length < 2) return false;
  return segments.every((segment) => segmentRegex.test(segment));
}
