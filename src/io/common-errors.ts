import { CustomError } from "ts-custom-error";

/**
 * Generic error for when some non-specific IO operation failed.
 */
export class GenericIOError extends CustomError {
  // noinspection JSUnusedLocalSymbols
  private readonly _class = "GenericIOError";
}

/**
 * Error for when a required file or directory is missing.
 */
export class FileMissingError<const TName extends string> extends CustomError {
  // noinspection JSUnusedLocalSymbols
  private readonly _class = "FileMissingError";

  public constructor(
    /**
     * Name of the file. This is a constant string that can be used in
     * ifs and switches to identify the file that was missing.
     */
    public readonly fileName: TName,
    /**
     * The path where the file was searched but not found.
     */
    public readonly path: string
  ) {
    super();
  }
}

/**
 * Generic error for when some non-specific network operation failed.
 */
export class GenericNetworkError extends CustomError {
  private readonly _class = "GenericNetworkError";
}

/**
 * Error for when authentication with a registry failed.
 */
export class RegistryAuthenticationError extends CustomError {
  private readonly _class = "RegistryAuthenticationError";

  constructor() {
    super();
  }
}
