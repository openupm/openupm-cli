import { parseUpmConfig, type UpmConfig } from "../domain/upm-config";
import { ReadTextFile } from "../io/text-file-io";

/**
 * Loads an upm-config file.
 * @param readFile IO function for reading the file.
 * @param filePath Path of the upm-config file.
 * @returns The config or null if it was not found.
 */
export async function loadUpmConfigUsing(
  readFile: ReadTextFile,
  filePath: string
): Promise<UpmConfig | null> {
  const stringContent = await readFile(filePath);
  if (stringContent === null) return null;
  return parseUpmConfig(stringContent);
}
