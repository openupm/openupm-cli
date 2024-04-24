import {
  LoadProjectManifest,
  manifestPathFor,
  ManifestWriteError,
  WriteProjectManifest,
} from "../../src/io/project-manifest-io";
import { UnityProjectManifest } from "../../src/domain/project-manifest";
import { Err, Ok } from "ts-results-es";
import { NotFoundError } from "../../src/io/file-io";

/**
 * Mocks results for a {@link LoadProjectManifest} function.
 * @param loadProjectManifest The load function.
 * @param manifest The manifest that should be returned. Null if there should
 * be no manifest.
 */
export function mockProjectManifest(
  loadProjectManifest: jest.MockedFunction<LoadProjectManifest>,
  manifest: UnityProjectManifest | null
) {
  return loadProjectManifest.mockImplementation((projectPath) => {
    const manifestPath = manifestPathFor(projectPath);
    return manifest === null
      ? Err(new NotFoundError(manifestPath)).toAsyncResult()
      : Ok(manifest).toAsyncResult();
  });
}

/**
 * Mocks the result of writing the project manifest.
 * @param writeProjectManifest The write function.
 * @param error The error that should be returned by the write operation. If
 * omitted the operation will be mocked to succeed.
 */
export function mockProjectManifestWriteResult(
  writeProjectManifest: jest.MockedFunction<WriteProjectManifest>,
  error?: ManifestWriteError
) {
  const result = error !== undefined ? Err(error) : Ok(undefined);
  return writeProjectManifest.mockReturnValue(result.toAsyncResult());
}
