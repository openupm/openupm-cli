import { CustomError } from "ts-custom-error";
import type { DomainName } from "./domain-name.js";
import type { EditorVersion } from "./editor-version.js";

/**
 * Error for when the packument was not found.
 */
export class PackumentNotFoundError extends CustomError {
  // noinspection JSUnusedLocalSymbols

  constructor(
    /**
     * The name of the missing package.
     */
    public packageName: DomainName
  ) {
    super();
  }
}

/**
 * Error for when OpenUPM was used with an editor-version that is not supported.
 */
export class EditorVersionNotSupportedError extends CustomError {
  constructor(
    /**
     * The unsupported version.
     */
    public readonly version: EditorVersion
  ) {
    super();
  }
}

export class MalformedPackumentError extends CustomError {
  constructor() {
    super();
  }
}
