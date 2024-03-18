import { CustomError } from "ts-custom-error";

/**
 * Error for when a file that is required for the program to function
 * was not found.
 */
export class RequiredFileNotFoundError extends CustomError {
  constructor(
    /**
     * The path where the file was expected to be.
     */
    readonly path: string
  ) {
    super(`The required file at "${path}" could not be found.`);
  }
}

/**
 * Generic IO error for when interacting with the file-system failed.
 */
export class IOError extends CustomError {
  constructor(cause?: Error) {
    super("An interaction with the file-system caused an error.", { cause });
  }
}

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
export class FileParseError extends CustomError {
  constructor(
    /**
     * The path to the file that could not be parsed.
     */
    readonly path: string,
    /**
     * A description or name of the thing that the file was supposed to be
     * parsed to.
     */
    readonly targetDescription: string,
    /**
     * The error that caused this one.
     */
    readonly cause?: Error
  ) {
    super("A file could not be parsed into a specific target type.");
  }
}
