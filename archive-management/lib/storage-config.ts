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
 * - Bucket-based storage for better file organization
 */

import { join } from "path";
import { existsSync, mkdirSync } from "fs";

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

// ============================================
// Bucket-based Storage Functions
// ============================================

/**
 * Extract year from archive number (档号)
 *
 * Archive number format: {全宗号-保管期限代码-年度-机构问题代码-盒号-件号}
 * Example: 00000-Y-2026-bgs-0001-00014 -> 2026
 *          00000-Y-2011-bgs-0001-10011 -> 2011
 *
 * @param archiveNo - Archive number (档号)
 * @returns Year string or null if not found
 */
export function extractYearFromArchiveNo(archiveNo: string): string | null {
  if (!archiveNo) {
    return null;
  }

  // Split by dash and get the 3rd segment (index 2)
  const parts = archiveNo.split("-");

  if (parts.length >= 3) {
    const yearPart = parts[2];

    // Check if it's a valid 4-digit year (1900-2099)
    const yearMatch = yearPart.match(/^(19|20)\d{2}$/);

    if (yearMatch) {
      return yearMatch[0];
    }
  }

  return null;
}

/**
 * Calculate bucket number (0-9) from archive number
 *
 * Uses a simple hash function to evenly distribute files across 10 buckets.
 * The algorithm ensures that files with similar archive numbers are distributed
 * across different buckets for better load balancing.
 *
 * @param archiveNo - Archive number (档号)
 * @returns Bucket number (0-9)
 */
export function calculateBucketNumber(archiveNo: string): number {
  if (!archiveNo) {
    // Fallback to bucket 0 for empty archive numbers
    return 0;
  }

  // Simple hash function: sum of character codes
  let hash = 0;
  for (let i = 0; i < archiveNo.length; i++) {
    hash = ((hash << 5) - hash) + archiveNo.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }

  // Take absolute value and modulo 10 to get bucket 0-9
  return Math.abs(hash) % 10;
}

/**
 * Get bucket directory name
 *
 * Format: {year}-{bucketNumber}
 * Example: 2026-0, 2011-9
 *
 * @param year - Year string (e.g., "2026")
 * @param bucketNumber - Bucket number (0-9)
 * @returns Bucket directory name
 */
export function getBucketDirName(year: string, bucketNumber: number): string {
  return `${year}-${bucketNumber}`;
}

/**
 * Calculate bucket path for an archive
 *
 * This function:
 * 1. Extracts year from archive number (or uses current year as fallback)
 * 2. Calculates bucket number (0-9) from archive number
 * 3. Returns the full bucket path
 *
 * @param archiveNo - Archive number (档号)
 * @param fallbackYear - Optional fallback year (defaults to current year)
 * @returns Object containing year, bucketNumber, bucketPath, and bucketDirName
 */
export function calculateBucketPath(
  archiveNo: string,
  fallbackYear?: string
): {
  year: string;
  bucketNumber: number;
  bucketDirName: string;
  bucketPath: string;
} {
  // Extract year from archive number, or use fallback
  let year = extractYearFromArchiveNo(archiveNo);

  if (!year) {
    // Use provided fallback year or current system year
    year = fallbackYear || new Date().getFullYear().toString();
  }

  // Calculate bucket number (0-9)
  const bucketNumber = calculateBucketNumber(archiveNo);

  // Generate bucket directory name
  const bucketDirName = getBucketDirName(year, bucketNumber);

  // Get base storage path and join with bucket directory
  const basePath = getPdfStoragePath();
  const bucketPath = join(basePath, bucketDirName);

  return {
    year,
    bucketNumber,
    bucketDirName,
    bucketPath,
  };
}

/**
 * Ensure bucket directory exists
 *
 * Creates the bucket directory if it doesn't exist.
 * This function is synchronous for simplicity during import operations.
 *
 * @param bucketPath - Full path to the bucket directory
 */
export function ensureBucketDir(bucketPath: string): void {
  if (!existsSync(bucketPath)) {
    mkdirSync(bucketPath, { recursive: true });

    if (process.env.NODE_ENV === "development") {
      console.log(`[Storage Config] Created bucket directory: ${bucketPath}`);
    }
  }
}

/**
 * Get full file path for a PDF in bucket storage
 *
 * @param archiveNo - Archive number (档号), used to calculate bucket
 * @param archiveId - Archive ID (used as filename)
 * @param fallbackYear - Optional fallback year
 * @returns Full path to the PDF file
 */
export function getPdfBucketFilePath(
  archiveNo: string,
  archiveId: string,
  fallbackYear?: string
): string {
  const { bucketPath } = calculateBucketPath(archiveNo, fallbackYear);
  return join(bucketPath, `${archiveId}.pdf`);
}

/**
 * Parse bucket info from file URL or filename
 *
 * Supports two formats:
 * 1. Full URL: /pdfs/{year}-{bucket}/{archiveID}.pdf
 * 2. Bucket path with filename: {year}-{bucket}/{archiveID}.pdf
 * 3. Legacy filename: {archiveID}.pdf (returns null)
 *
 * Example: /pdfs/2026-0/clh12345.pdf -> { year: "2026", bucketNumber: 0, archiveId: "clh12345" }
 * Example: 2026-0/clh12345.pdf -> { year: "2026", bucketNumber: 0, archiveId: "clh12345" }
 * Example: clh12345.pdf -> null (legacy format)
 *
 * @param fileUrlOrName - File URL path or filename
 * @returns Object with year, bucketNumber, archiveId or null if invalid/legacy format
 */
export function parseBucketFileUrl(fileUrlOrName: string): {
  year: string;
  bucketNumber: number;
  archiveId: string;
} | null {
  if (!fileUrlOrName) {
    return null;
  }

  // Remove .pdf extension for parsing
  const pathWithoutExt = fileUrlOrName.replace(/\.pdf$/i, "");

  // Try bucket format: {year}-{bucket}/{archiveId}
  // Match pattern with or without leading /pdfs/
  const bucketMatch = pathWithoutExt.match(/(?:\/pdfs\/)?(\d{4})-(\d)\/([^/]+)$/);

  if (bucketMatch) {
    return {
      year: bucketMatch[1],
      bucketNumber: parseInt(bucketMatch[2], 10),
      archiveId: bucketMatch[3],
    };
  }

  // Legacy format: just archiveId without bucket path
  return null;
}
