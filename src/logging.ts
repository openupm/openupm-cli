import npmlog from "npmlog";

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

export const noopLogger: DebugLog = () => {};

/**
 * {@link DebugLog} function which uses {@link npmlog} to print logs to
 * the console.
 */
export const npmDebugLog: DebugLog = function (message, context) {
  const contextMessage =
    context !== undefined
      ? `\n${
          context instanceof Error
            ? context.toString()
            : JSON.stringify(context, null, 2)
        }`
      : "";
  return npmlog.verbose("", `${message}${contextMessage}`);
};
