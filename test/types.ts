import { Contact } from "../src/types/contact";
import { DomainName } from "../src/types/domain-name";
import { SemanticVersion } from "../src/types/semantic-version";

type Maintainer = { username: string; email: string };

export type SearchEndpointResult = {
  objects: Array<{
    package: {
      name: DomainName;
      description?: string;
      date: string;
      scope: "unscoped";
      version: SemanticVersion;
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
