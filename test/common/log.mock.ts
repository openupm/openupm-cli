import type { Logger } from "../../src/cli/logger";

/**
 * Creates mock logger.
 */
export function makeMockLogger(): jest.Mocked<Logger> {
  return {
    level: "notice",
    verbose: jest.fn(),
    notice: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    disableColor: jest.fn(),
  };
}
