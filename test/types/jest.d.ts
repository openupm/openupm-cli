import { DomainName } from "../../src/domain/domain-name";
import { SemanticVersion } from "../../src/domain/semantic-version";
import { PackageUrl } from "../../src/domain/package-url";

declare global {
  namespace jest {
    // noinspection JSUnusedGlobalSymbols
    interface Matchers<R> {
      toHaveDependency(
        name: DomainName,
        version?: SemanticVersion | PackageUrl
      ): R;

      toHaveDependencies(): R;

      toHaveScope(scope: DomainName): R;

      toHaveScopedRegistries(): R;

      toBeOk<T>(valueAsserter?: (value: T) => void): R;

      toBeError<T>(errorAsserter?: (error: T) => void): R;
    }
  }
}

export {};
