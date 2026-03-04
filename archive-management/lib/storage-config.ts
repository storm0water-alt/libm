/**
 * Storage Configuration
 *
 * Centralized configuration for file storage paths.
 * Ensures consistent path handling across different platforms (Windows, macOS, Linux).
 *
 * Features:
 * - Cross-platform path normalization
 * - Environment variable management
 * - Consistent default values across the application
 */

import { join } from "path";

/**
 * Normalize a file path for the current platform
 *
 * This function ensures that:
 * 1. Path separators are correct for the current OS
 * 2. Trailing separators are removed
 * 3. Leading/trailing whitespace is removed
 *
 * @param inputPath - The path to normalize
 * @returns Normalized path for the current platform
 */
function normalizeStoragePath(inputPath: string): string {
  if (!inputPath) {
    return inputPath;
  }

  // Remove leading/trailing whitespace
  let normalized = inputPath.trim();

  // Remove trailing path separators (both / and \)
  normalized = normalized.replace(/[\/\\]+$/, "");

  return normalized;
}

/**
 * Get the PDF storage path
 *
 * Priority:
 * 1. PDF_STORAGE_PATH environment variable
 * 2. ARCHIVE_STORAGE_PATH environment variable (for backward compatibility)
 * 3. Default: <cwd>/public/pdfs
 *
 * The path is normalized to ensure:
 * - Correct path separators for the current OS
 * - No trailing separators
 * - No leading/trailing whitespace
 *
 * @returns Absolute or relative path to PDF storage directory
 */
export function getPdfStoragePath(): string {
  const rawPath =
    process.env.PDF_STORAGE_PATH ||
    process.env.ARCHIVE_STORAGE_PATH ||
    join(process.cwd(), "public", "pdfs");

  const normalizedPath = normalizeStoragePath(rawPath);

  // Log for debugging in development
  if (process.env.NODE_ENV === "development") {
    console.log("[Storage Config] PDF Storage Path:");
    console.log("  - Environment PDF_STORAGE_PATH:", process.env.PDF_STORAGE_PATH || "(not set)");
    console.log("  - Environment ARCHIVE_STORAGE_PATH:", process.env.ARCHIVE_STORAGE_PATH || "(not set)");
    console.log("  - Raw path:", rawPath);
    console.log("  - Normalized path:", normalizedPath);
    console.log("  - Current working directory:", process.cwd());
  }

  return normalizedPath;
}

/**
 * Get the PDF upload path
 *
 * For now, this is the same as the storage path, but can be configured
 * separately in the future if needed.
 *
 * @returns Path to PDF upload directory
 */
export function getPdfUploadPath(): string {
  return getPdfStoragePath();
}

/**
 * Storage path configuration object
 *
 * This can be imported as a namespace for cleaner code:
 *
 * @example
 * ```ts
 * import { StorageConfig } from '@/lib/storage-config';
 *
 * const pdfPath = StorageConfig.pdfPath;
 * ```
 */
export const StorageConfig = {
  get pdfPath(): string {
    return getPdfStoragePath();
  },

  get uploadPath(): string {
    return getPdfUploadPath();
  },
};
