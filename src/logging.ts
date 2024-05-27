/**
 * Function that logs a message to some external system. This interface is
 * output-agnostic meaning that the logs could go to a console, file or other.
 * This interface is supposed to be only used for debug logs, not for
 * user-facing logs.
 * @param message The message to be logged.
 * @param context Optional context object. Will be stringified and appended
 * to the message.
 * @returns Nothing. Could be asynchronous.
 */
export type DebugLog = (
  message: string,
  context?: object
) => void | Promise<void>;
