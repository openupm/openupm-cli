import { z, ZodType } from "zod";
import { AssertionError } from "assert";

/**
 * Checks that a value matches a zod type. Also narrows the value to the
 * zod schemas type.
 * @param value The value to check.
 * @param schema The zod schema to check against.
 */
export function isZod<TZod extends ZodType>(
  value: TZod["_input"],
  schema: TZod
): value is TZod["_output"] {
  return schema.safeParse(value).success;
}

/**
 * Asserts that a value matches a zod type. Also narrows the value to the
 * zod schemas type.
 * @param value The value to check.
 * @param schema The zod schema to check against.
 * @throws {AssertionError} If value does not match schema.
 */
export function assertZod<TZod extends ZodType>(
  value: TZod["_input"],
  schema: TZod
): asserts value is TZod["_output"] {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new AssertionError({
      actual: value,
      expected: "Instance of: " + schema,
      message: result.error.message,
    });
}

/**
 * Recursively removes all instances of `undefined` from a type.
 */
export type RemoveExplicitUndefined<T> = T extends undefined
  ? never
  : T extends z.BRAND<string>
  ? T
  : T extends object
  ? { [K in keyof T]: RemoveExplicitUndefined<T[K]> }
  : T;

export function removeExplicitUndefined(value: undefined): never;
export function removeExplicitUndefined<T>(
  value: T
): RemoveExplicitUndefined<T>;
/**
 * Recursively removes all instances of explicit undefined from a value.
 * This mostly gets rid of explicit undefined properties in objects.
 *
 * You can use this function to circumvent [issue #365](https://github.com/colinhacks/zod/issues/635).
 * @param value The value.
 * @throws {Error} If the passed value is undefined.
 */
export function removeExplicitUndefined(value: unknown) {
  if (value === undefined)
    throw new Error("Cannot remove undefined from undefined!");

  if (value === null || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([key, v]) => [key, removeExplicitUndefined(v)])
  );
}
