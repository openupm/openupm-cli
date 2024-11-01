import fc from "fast-check";
import { DomainName } from "../../../src/domain/domain-name.js";

/**
 * Single char string [A-Z].
 */
const arbUppercaseLatinLetter = fc
  .integer({ min: 65, max: 90 })
  .map(String.fromCharCode);

/**
 * Single char string [a-z].
 */
const arbLowercaseLatinLetter = fc
  .integer({ min: 97, max: 122 })
  .map(String.fromCharCode);

/**
 * Single char string [a-zA-Z].
 */
const arbLatinLetter = fc.oneof(
  arbUppercaseLatinLetter,
  arbLowercaseLatinLetter
);

/**
 * Integer [0-9].
 */
const arbDigit = fc.integer({ min: 0, max: 9 });

const hyphen = fc.constant("-" as const);

const arbSegmentSymbol = fc.oneof(arbLatinLetter, arbDigit, hyphen);

const arbSegment = fc
  .tuple(
    arbLatinLetter,
    fc.array(arbSegmentSymbol, { maxLength: 5 }),
    arbLatinLetter
  )
  .map(([start, middle, end]) => `${start}${middle.join("")}${end}`)
  .filter((segment) => !segment.includes("--"));

/**
 * String matching {@link DomainName} rules.
 */
export const arbDomainName = fc
  .array(arbSegment, {
    minLength: 1,
    maxLength: 4,
  })
  .map((segments) => segments.join("."))
  .map(DomainName.parse);
