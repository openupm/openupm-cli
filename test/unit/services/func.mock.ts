/**
 * Creates a mock for a function of a specific type.
 * This is just a typing-utility function. Under the hood this just calls
 * {@link jest.fn}.
 */
export function mockFunctionOfType<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TFunc extends (...args: any[]) => any
>(): jest.MockedFunction<TFunc> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return jest.fn();
}
