import { Contact, PkgVersion } from "../src/types/global";
import { DomainName } from "../src/types/domain-name";

type Maintainer = { username: string; email: string };

export type SearchEndpointResult = {
  objects: Array<{
    package: {
      name: DomainName;
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
