import { UPMConfig } from "../src/domain/upm-config";
import * as upmConfigIoModule from "../src/io/upm-config-io";
import { Ok } from "ts-results-es";

/**
 * Mocks return value for calls to {@link tryLoadUpmConfig}.
 * @param config The upm-config that should be returned.
 */
export function mockUpmConfig(config: UPMConfig | null) {
  jest
    .spyOn(upmConfigIoModule, "tryLoadUpmConfig")
    .mockReturnValue(Ok(config).toAsyncResult());
}
