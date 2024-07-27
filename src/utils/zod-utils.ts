import { ZodAny, ZodType, ZodTypeDef } from "zod";
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
 * @throws AssertionError if value does not match schema.
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
