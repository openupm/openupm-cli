/**
 * Options which are shared between commands.
 */
export type GlobalOptions = Readonly<{
  /**
   * Whether to print logs.
   */
  verbose?: boolean;
  /**
   * Whether to use color in the console.
   */
  color?: boolean;
  /**
   * Whether to fall back to the Unity registry.
   */
  upstream?: boolean;
  /**
   * Whether to run commands for the chinese locale.
   */
  cn?: boolean;
  /**
   * Whether to authenticate as a Windows system-user.
   */
  systemUser?: boolean;
}>;

/**
 * Command-options. Extends the given record with {@link GlobalOptions}.
 */
export type CmdOptions<
  TOptions extends Record<string, unknown> = Record<string, unknown>
> = Readonly<TOptions & GlobalOptions>;
