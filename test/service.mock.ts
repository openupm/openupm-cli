/**
 * Creates a mock for a service function.
 * This is just a typing-utility function. Under the hood this just calls
 * {@link jest.fn}.
 */
export function mockService<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (...args: any[]) => any
>(): jest.MockedFunction<T> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return jest.fn();
}
