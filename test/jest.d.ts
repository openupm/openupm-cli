import { Stream } from "./mock-console";
import { DomainName } from "../src/domain/domain-name";
import { SemanticVersion } from "../src/domain/semantic-version";
import { PackageUrl } from "../src/domain/package-url";

declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveLineIncluding(stream: Stream, text: string): R;

      toHaveDependency(
        name: DomainName,
        version?: SemanticVersion | PackageUrl
      ): R;

      toHaveDependencies(): R;

      toHaveScope(scope: DomainName): R;

      toHaveScopedRegistries(): R;

      toBeOk<T>(valueAsserter?: (value: T) => void): R;

      toBeError(errorAsserter?: (error: Error) => void): R;
    }
  }
}

export {};
