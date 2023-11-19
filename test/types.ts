import { Contact, PkgVersion } from "../src/types/global";
import { ReverseDomainName } from "../src/types/reverse-domain-name";

type Maintainer = { username: string; email: string };

export type SearchEndpointResult = {
  objects: Array<{
    package: {
      name: ReverseDomainName;
      description?: string;
      date: string;
      scope: "unscoped";
      version: PkgVersion;
      links: Record<string, unknown>;
      author: Contact;
      publisher: Maintainer;
      maintainers: Maintainer[];
    };
    flags: { unstable: boolean };
    score: {
      final: number;
      detail: {
        quality: number;
        popularity: number;
        maintenance: number;
      };
    };
    searchScore: number;
  }>;
  total: number;
  time: string;
};
