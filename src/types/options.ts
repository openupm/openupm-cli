/**
 * Options which are shared between commands.
 */
type GlobalOptions = {
  /**
   * Override package registry to use.
   */
  registry?: string;
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
  /**
   * Whether WSL should be treated as Windows.
   */
  wsl?: boolean;
  /**
   * Override working directory.
   */
  chdir?: string;
};

/**
 * Command-options. Extends the given record with a _global property
 * containing {@link GlobalOptions}.
 */
export type CmdOptions<
  TOptions extends Record<string, unknown> = Record<string, unknown>
> = TOptions & {
  _global: GlobalOptions;
};
