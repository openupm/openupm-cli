import { CustomError } from "ts-custom-error";
import { EditorVersion } from "./domain/editor-version";

/**
 * Error for when the packument was not found.
 */
export class PackumentNotFoundError extends CustomError {
  // noinspection JSUnusedLocalSymbols
  private readonly _class = "PackumentNotFoundError";
  constructor() {
    super("A packument was not found.");
  }
}

/**
 * Error for when a function expected a package-reference with only a name
 * e.g. "com.my-package", but it also included a version e.g.
 * "com.my-package@1.2.3".
 */
export class PackageWithVersionError extends CustomError {
  // noinspection JSUnusedLocalSymbols
  private readonly _class = "PackageWithVersionError";
  constructor() {
    super(
      "A package-reference including a version was specified when only a name was expected."
    );
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
