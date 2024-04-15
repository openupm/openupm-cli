import { DomainName } from "../src/domain/domain-name";
import { SemanticVersion } from "../src/domain/semantic-version";
import { PackageUrl } from "../src/domain/package-url";

declare global {
  namespace jest {
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

      // Log

      /**
       * Tests if a specific log was made to this spy.
       * @param prefix The prefix. This is matched exactly.
       * @param message The message. This matches if a log includes this string.
       * @param count The minimum number of times a message matching the given criteria
       * should have been logged. Defaults to 1 if omitted.
       */
      toHaveLogLike(prefix: string, message: string, count?: number): R;
    }
  }
}

export {};
