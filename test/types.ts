import { DomainName } from "../src/domain/domain-name";
import { SemanticVersion } from "../src/domain/semantic-version";
import { Maintainer } from "@npm/types";

export type SearchEndpointResult = {
  objects: Array<{
    package: {
      name: DomainName;
      description?: string;
      date: string;
      scope: "unscoped";
      version: SemanticVersion;
      links: Record<string, unknown>;
      author: Maintainer;
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
