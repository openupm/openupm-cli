import { CustomError } from "ts-custom-error";
import { EditorVersion } from "./domain/editor-version";

/**
 * Error for when the packument was not found.
 */
export class PackumentNotFoundError extends CustomError {
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
  constructor() {
    super(
      "A package-reference including a version was specified when only a name was expected."
    );
  }
}

/**
 * Error for when a file could not be parsed into a specific target type.
 */
export class FileParseError<const TTarget extends string> extends CustomError {
  constructor(
    /**
     * The path to the file that could not be parsed.
     */
    public readonly filePath: string,
    /**
     * A description or name of the thing that the file was supposed to be
     * parsed to. This should be a constant string that can be used in ifs
     * and switches.
     */
    public readonly targetDescription: TTarget
  ) {
    super("A file could not be parsed into a specific target type.");
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
