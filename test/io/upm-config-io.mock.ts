import { UPMConfig } from "../../src/domain/upm-config";
import { LoadUpmConfig } from "../../src/io/upm-config-io";
import { Ok } from "ts-results-es";

/**
 * Mocks return value for calls to {@link LoadUpmConfig} function.
 * @param loadUpmConfig The function to mock.
 * @param config The upm-config that should be returned.
 */
export function mockUpmConfig(
  loadUpmConfig: jest.MockedFunction<LoadUpmConfig>,
  config: UPMConfig | null
) {
  loadUpmConfig.mockReturnValue(Ok(config).toAsyncResult());
}
