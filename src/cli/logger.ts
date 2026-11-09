import chalk, { Chalk } from "chalk";

/**
 * The levels at which messages can be logged, from least to most severe.
 */
const logLevels = ["verbose", "notice", "warn", "error"] as const;

/**
 * A level at which messages can be logged.
 */
export type LogLevel = (typeof logLevels)[number];

const levelLabels: Readonly<Record<LogLevel, (colors: Chalk) => string>> = {
  verbose: (colors) => colors.cyan.bgBlack("verb"),
  notice: (colors) => colors.cyan.bgBlack("notice"),
  warn: (colors) => colors.black.bgYellow("WARN"),
  error: (colors) => colors.red.bgBlack("ERR!"),
};

const colored = new chalk.Instance({ level: 1 });
const uncolored = new chalk.Instance({ level: 0 });

/**
 * Logger for user-facing cli output. Each line of a message is printed as
 * `<level> [prefix] <line>`.
 */
export interface Logger {
  /**
   * The least severe level that will be printed.
   */
  level: LogLevel;
  /**
   * Logs a message at {@link LogLevel} "verbose".
   */
  verbose(prefix: string, message: string): void;
  /**
   * Logs a message at {@link LogLevel} "notice".
   */
  notice(prefix: string, message: string): void;
  /**
   * Logs a message at {@link LogLevel} "warn".
   */
  warn(prefix: string, message: string): void;
  /**
   * Logs a message at {@link LogLevel} "error".
   */
  error(prefix: string, message: string): void;
  /**
   * Stops coloring the output.
   */
  disableColor(): void;
}

/**
 * Makes a {@link Logger} which writes to a stream. Output is colored if the
 * stream is a TTY.
 * @param stream The stream to write to.
 */
export function makeStreamLogger(
  stream: Pick<NodeJS.WriteStream, "write" | "isTTY"> = process.stderr
): Logger {
  let useColor = stream.isTTY === true;

  function log(level: LogLevel, prefix: string, message: string) {
    if (logLevels.indexOf(level) < logLevels.indexOf(logger.level)) return;

    const colors = useColor ? colored : uncolored;
    const label = levelLabels[level](colors);
    const head = prefix !== "" ? `${label} ${colors.magenta(prefix)}` : label;
    for (const line of message.split(/\r?\n/))
      stream.write(`${head} ${line}\n`);
  }

  const logger: Logger = {
    level: "notice",
    verbose: (prefix, message) => log("verbose", prefix, message),
    notice: (prefix, message) => log("notice", prefix, message),
    warn: (prefix, message) => log("warn", prefix, message),
    error: (prefix, message) => log("error", prefix, message),
    disableColor() {
      useColor = false;
    },
  };
  return logger;
}
