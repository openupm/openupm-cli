import { CustomError } from "ts-custom-error";
import { EditorVersion } from "./domain/editor-version";
import { DomainName } from "./domain/domain-name";

/**
 * Error for when the packument was not found.
 */
export class PackumentNotFoundError extends CustomError {
  // noinspection JSUnusedLocalSymbols
  private readonly _class = "PackumentNotFoundError";
  constructor(
    /**
     * The name of the missing package.
     */
    public packageName: DomainName
  ) {
    super("A packument was not found.");
  }
}

/**
 * Error for when OpenUPM was used with an editor-version that is not supported.
 */
export class EditorVersionNotSupportedError extends CustomError {
  private readonly _class = "EditorVersionNotSupportedError";
  constructor(
    /**
     * The unsupported version.
     */
    public readonly version: EditorVersion
  ) {
    super();
  }
}
