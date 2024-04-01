/**
 * Attempts to get the value for an env key.
 * @param key The key to search.
 */
export function tryGetEnv(key: string): string | null {
  return process.env[key] ?? null;
}
