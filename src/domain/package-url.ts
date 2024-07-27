import { z } from "zod";

const GitUrl = z.string().startsWith("git");

const HttpUrl = z.string().startsWith("http");

const FileUrl = z.string().startsWith("file");

/**
 * Schema for {@link PackageUrl}.
 */
export const PackageUrl = z
  .union([GitUrl, HttpUrl, FileUrl])
  .brand("PackageUrl");

/**
 * Checks if a version is a package-url.
 * @param version The version.
 */
export type PackageUrl = z.TypeOf<typeof PackageUrl>;
