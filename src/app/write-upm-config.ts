import { type UpmConfig, serializeUpmConfig } from "../domain/upm-config";
import type { WriteTextFile } from "../io/fs";

/**
 * Save the upm config by overwriting the `.upmconfig.toml` file.
 * @param writeFile IO function for overwriting the file.
 * @param filePath The path of the file that should be saved to.
 * @param config The config to save.
 */
export function saveUpmConfigFileUsing(
  writeFile: WriteTextFile,
  filePath: string,
  config: UpmConfig
): Promise<void> {
  const content = serializeUpmConfig(config);
  return writeFile(filePath, content);
}
