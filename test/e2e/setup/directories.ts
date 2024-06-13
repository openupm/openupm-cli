import os from "os";
import fse from "fs-extra";

const homePath = os.homedir();

/**
 * Gets the path to the users home-directory and makes sure it exists.
 */
export async function prepareHomeDirectory(): Promise<string> {
  await fse.ensureDir(homePath);
  return homePath;
}

export async function dropDirectory(dir: string): Promise<void> {
  await fse.remove(dir);
}
