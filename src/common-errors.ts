import { CustomError } from "ts-custom-error";

export class RequiredFileNotFoundError extends CustomError {
  constructor(readonly path: string) {
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
