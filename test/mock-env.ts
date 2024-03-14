/**
 * Represents a currently active mock-env session.
 */
export type MockEnvSession = {
  /**
   * Stops this mock-env session and revert to the original {@link process.env}.
   */
  unhook(): void;
};

/**
 * Replaces {@link process.env} with the given object until the session
 * is unhooked.
 * @param env The replacement env.
 * @returns A session object that can be used to unhook the replacement env.
 * @throws {Error} If a mock-env session is already in progress.
 */
export function mockEnv(env: object): MockEnvSession {
  const originalEnv = process.env;
  if ("IS_MOCK" in originalEnv)
    throw new Error(
      "A mock-env session is already in progress. Did you forget to unhook?"
    );
  process.env = { ...env, IS_MOCK: "TRUE" };
  return {
    unhook() {
      process.env = originalEnv;
    },
  };
}

/**
 * Runs the given function while setting {@link process.env} to the given
 * replacement object. Resets env back to original afterward.
 * @param env The replacement env.
 * @param func The function to execute.
 * @returns The result of the function.
 * @throws {unknown} Any errors the original function may throw. Env is cleaned
 * up even if an error was thrown.
 */
export function runWithEnv<T>(env: object, func: () => T): T {
  const envSession = mockEnv(env);
  try {
    return func();
  } finally {
    envSession.unhook();
  }
}
