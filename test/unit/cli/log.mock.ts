import { Logger } from "npmlog";

/**
 * Creates mock logger.
 */
export function makeMockLogger() {
  return jest.mocked(jest.createMockFromModule<Logger>("npmlog"));
}
