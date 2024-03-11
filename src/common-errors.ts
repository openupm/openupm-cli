import { CustomError } from "ts-custom-error";

export class RequiredFileNotFoundError extends CustomError {
  constructor(readonly path: string) {
    super(`The required file at "${path}" could not be found.`);
  }
}
