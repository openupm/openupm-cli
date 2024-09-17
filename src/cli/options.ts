/**
 * Options which are shared between commands.
 */
export type GlobalOptions = Readonly<{
  /**
   * Whether to use color in the console.
   */
  color?: boolean;
  /**
   * Whether to run commands for the chinese locale.
   */
  cn?: boolean;
}>;

/**
 * Command-options. Extends the given record with {@link GlobalOptions}.
 */
export type CmdOptions<
  TOptions extends Record<string, unknown> = Record<string, unknown>
> = Readonly<TOptions & GlobalOptions>;
