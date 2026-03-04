import { prisma } from "@/lib/prisma";
import { mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { createId } from "@paralleldrive/cuid2";
import { createLog } from "./log.service";

/**
 * PDF file information
 */
export interface PdfFile {
  /** Original file name */
  name: string;
  /** Full file path (client-side path or server-side path after upload) */
  path: string;
  /** File size in bytes */
  size: number;
  /** File object (only available on client-side before upload) */
  file?: File;
}

/**
 * File filter options
 */
export interface FileFilter {
  /** Minimum file size in bytes */
  minSize?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** File created after this date */
  createdAfter?: Date;
  /** File created before this date */
  createdBefore?: Date;
  /** File modified after this date */
  modifiedAfter?: Date;
  /** File modified before this date */
  modifiedBefore?: Date;
  /** File name pattern (glob or regex) */
  namePattern?: string | RegExp;
}

/**
 * Scan progress callback
 */
export interface ScanProgress {
  /** Total directories scanned */
  directoriesScanned: number;
  /** Total files found */
  filesFound: number;
  /** Current scanning path */
  currentPath: string;
  /** Scan cancelled flag */
  cancelled?: boolean;
}

/**
 * Scan options
 */
export interface ScanOptions {
  /** Maximum recursion depth (default: 10, 0 = unlimited) */
  maxDepth?: number;
  /** Progress callback */
  onProgress?: (progress: ScanProgress) => void;
  /** Enable concurrent scanning (default: true) */
  concurrent?: boolean;
  /** Abort signal for cancellation */
  signal?: AbortSignal;
  /** File filter options */
  filter?: FileFilter;
  /** Enable caching (default: true) */
  useCache?: boolean;
  /** Cache TTL in milliseconds (default: 60000 = 1 minute) */
  cacheTTL?: number;
}

/**
 * Import record with progress information
 */
export interface ImportRecordWithProgress {
  id: string;
  fileName: string;
  archiveId?: string | null;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled" | "skipped";
  progress: number;
  error?: string | null;
  operator?: string | null;
  createdAt: Date;
  updatedAt: Date;
  skipped?: number; // Number of skipped items
}

/**
 * Query parameters for import history
 */
export interface ImportHistoryParams {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Optional status filter */
  status?: string;
  /** Optional operator filter */
  operator?: string;
}

/**
 * Response from import history query
 */
export interface ImportHistoryResponse {
  /** Array of import records */
  items: ImportRecordWithProgress[];
  /** Total number of records */
  total: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Semaphore for controlling concurrent operations
 */
class Semaphore {
  private permits: number;
  private waitQueue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve();
      } else {
        this.waitQueue.push(() => {
          this.permits--;
          resolve();
        });
      }
    });
  }

  release(): void {
    this.permits++;
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) next();
    }
  }
}

/**
 * Storage configuration
 * Uses centralized storage configuration for cross-platform compatibility
 */
import { getPdfStoragePath, getPdfBucketFilePath, ensureBucketDir, calculateBucketPath } from "@/lib/storage-config";

const PDF_STORAGE_PATH = getPdfStoragePath();

/**
 * Import concurrency configuration
 */
const IMPORT_CONCURRENCY = parseInt(process.env.IMPORT_CONCURRENCY || "3");

/**
 * Import Service Class
 */
class ImportService {
  private semaphore: Semaphore;
  private scanCache: Map<string, { data: PdfFile[]; timestamp: number }>;

  constructor() {
    this.semaphore = new Semaphore(IMPORT_CONCURRENCY);
    this.scanCache = new Map();
  }

  /**
   * Generate cache key from folder path and options
   */
  private getCacheKey(folderPath: string, options: ScanOptions): string {
    const filterKey = options.filter 
      ? JSON.stringify(options.filter) 
      : '';
    return `${folderPath}:${options.maxDepth || 10}:${options.concurrent ? 1 : 0}:${filterKey}`;
  }

  /**
   * Check if file matches filter criteria
   */
  private matchesFilter(stats: { size: number; created: Date; modified: Date }, fileName: string, filter?: FileFilter): boolean {
    if (!filter) return true;

    // Size filter
    if (filter.minSize !== undefined && stats.size < filter.minSize) return false;
    if (filter.maxSize !== undefined && stats.size > filter.maxSize) return false;

    // Date filters
    if (filter.createdAfter && stats.created < filter.createdAfter) return false;
    if (filter.createdBefore && stats.created > filter.createdBefore) return false;
    if (filter.modifiedAfter && stats.modified < filter.modifiedAfter) return false;
    if (filter.modifiedBefore && stats.modified > filter.modifiedBefore) return false;

    // Name pattern filter
    if (filter.namePattern) {
      if (typeof filter.namePattern === 'string') {
        // Glob pattern matching
        const regex = new RegExp(filter.namePattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
        if (!regex.test(fileName)) return false;
      } else {
        // Regex matching
        if (!filter.namePattern.test(fileName)) return false;
      }
    }

    return true;
  }

  /**
   * Clear scan cache
   */
  clearScanCache(folderPath?: string): void {
    if (folderPath) {
      // Clear specific folder cache
      for (const key of this.scanCache.keys()) {
        if (key.startsWith(folderPath)) {
          this.scanCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.scanCache.clear();
    }
  }

  /**
   * Scan a folder for PDF files (recursively with all optimizations)
   * @param folderPath - Path to folder to scan
   * @param options - Scan options (maxDepth, onProgress, concurrent, signal, filter, useCache)
   * @returns Array of PDF file information
   */
  async scanFolder(folderPath: string, options: ScanOptions = {}): Promise<PdfFile[]> {
    const {
      maxDepth = 10,
      onProgress,
      concurrent = true,
      signal,
      filter,
      useCache = true,
      cacheTTL = 60000, // 1 minute default
    } = options;

    // Check cache first
    if (useCache) {
      const cacheKey = this.getCacheKey(folderPath, options);
      const cached = this.scanCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        console.log(`Using cached scan result for: ${folderPath}`);
        return cached.data;
      }
    }

    try {
      const { readdir, stat } = await import("fs/promises");
      const pdfFiles: PdfFile[] = [];
      let directoriesScanned = 0;
      let filesFound = 0;
      let cancelled = false;

      /**
       * Check if scan was cancelled
       */
      const checkCancelled = () => {
        if (signal?.aborted) {
          cancelled = true;
          if (onProgress) {
            onProgress({
              directoriesScanned,
              filesFound,
              currentPath: folderPath,
              cancelled: true,
            });
          }
          throw new Error('Scan cancelled by user');
        }
      };

      /**
       * Recursively scan directory for PDF files with all optimizations
       */
      const scanRecursive = async (dirPath: string, depth: number): Promise<void> => {
        checkCancelled();

        // Check depth limit
        if (maxDepth > 0 && depth > maxDepth) {
          console.log(`Max depth (${maxDepth}) reached, skipping: ${dirPath}`);
          return;
        }

        const entries = await readdir(dirPath, { withFileTypes: true });
        directoriesScanned++;

        // Report progress
        if (onProgress) {
          onProgress({
            directoriesScanned,
            filesFound,
            currentPath: dirPath,
          });
        }

        checkCancelled();

        // Separate directories and files for concurrent processing
        const directories: string[] = [];
        const files: string[] = [];

        for (const entry of entries) {
          const fullPath = join(dirPath, entry.name);
          if (entry.isDirectory()) {
            directories.push(fullPath);
          } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
            files.push(fullPath);
          }
        }

        // Process PDF files with filtering
        const processFile = async (fullPath: string) => {
          try {
            const stats = await stat(fullPath);
            const fileName = fullPath.split('/').pop() || fullPath.split('\\').pop() || fullPath;

            // Get file metadata for filtering
            const fileStats = {
              size: stats.size,
              created: stats.birthtime,
              modified: stats.mtime,
            };

            // Apply filters
            if (this.matchesFilter(fileStats, fileName, filter)) {
              pdfFiles.push({
                name: fileName,
                path: fullPath,
                size: stats.size,
              });
              filesFound++;

              // Report progress on each file found
              if (onProgress) {
                onProgress({
                  directoriesScanned,
                  filesFound,
                  currentPath: fullPath,
                });
              }
            }
          } catch (error) {
            console.error(`Error reading file ${fullPath}:`, error);
          }
        };

        // Process files (concurrent or sequential)
        if (concurrent && files.length > 0) {
          await Promise.all(files.map(processFile));
        } else {
          for (const fullPath of files) {
            checkCancelled();
            await processFile(fullPath);
          }
        }

        checkCancelled();

        // Process subdirectories (concurrent or sequential)
        if (concurrent) {
          await Promise.all(directories.map(dir => scanRecursive(dir, depth + 1)));
        } else {
          for (const dir of directories) {
            await scanRecursive(dir, depth + 1);
          }
        }
      };

      await scanRecursive(folderPath, 1);

      console.log(`Scan completed: ${filesFound} PDF files found in ${directoriesScanned} directories`);

      // Cache the result
      if (useCache && !cancelled) {
        const cacheKey = this.getCacheKey(folderPath, options);
        this.scanCache.set(cacheKey, {
          data: pdfFiles,
          timestamp: Date.now(),
        });
      }

      return pdfFiles;
    } catch (error) {
      if (error instanceof Error && error.message === 'Scan cancelled by user') {
        console.log('Scan was cancelled by user');
        throw error;
      }
      console.error("Error scanning folder:", error);
      throw new Error(`Failed to scan folder: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Start import process for selected files (with parallel processing)
   * @param files - Array of PDF files to import
   * @param operator - Username of operator
   * @param clientIp - Client IP address
   * @returns Array of created import records
   */
  async startImport(files: PdfFile[], operator: string, clientIp: string = ""): Promise<ImportRecordWithProgress[]> {
    const records: ImportRecordWithProgress[] = [];

    // Create all import records first
    for (const file of files) {
      try {
        const record = await prisma.importRecord.create({
          data: {
            total: files.length,
            processed: 0,
            failed: 0,
            status: "pending",
            user: {
              connect: { username: operator },
            },
          },
        });

        records.push({
          id: record.id,
          fileName: file.name,
          archiveId: null,
          status: "pending" as const,
          progress: 0,
          error: null,
          operator: operator,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        });
      } catch (error) {
        console.error(`Error creating import record for ${file.name}:`, error);
      }
    }

    // Start parallel processing with controlled concurrency
    const processingPromises = files.map(async (file, index) => {
      const record = records[index];
      if (!record) return;

      await this.semaphore.acquire();
      try {
        await this.processFile(record.id, file, operator, clientIp);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      } finally {
        this.semaphore.release();
      }
    });

    // Process files in parallel but don't wait for completion here
    // The progress can be tracked via getProgress method
    // Handle errors gracefully
    processingPromises.forEach((promise) => {
      promise.catch((error) => {
        console.error("Error in parallel processing:", error);
      });
    });

    return records;
  }

  /**
   * Optimized file copy strategy - uses Node.js copyFile for cross-platform compatibility
   * @param source - Source file path
   * @param dest - Destination file path
   */
  private async copyFileOptimized(source: string, dest: string): Promise<void> {
    // Use Node.js copyFile - it's cross-platform and efficient
    const { copyFile } = await import("fs/promises");
    await copyFile(source, dest);
  }

  /**
   * Process a single PDF file (async)
   * @param recordId - Import record ID
   * @param file - PDF file information
   * @param operator - Username of operator
   * @param clientIp - Client IP address
   */
  private async processFile(
    recordId: string,
    file: PdfFile,
    operator: string,
    clientIp: string = ""
  ): Promise<void> {
    try {
      // Check if source file exists
      if (!existsSync(file.path)) {
        throw new Error(`Source file does not exist: ${file.path}`);
      }

      // Update status to processing
      await prisma.importRecord.update({
        where: { id: recordId },
        data: { status: "processing" },
      });

      // Generate archive number (档号) - extract filename without path and extension
      const fileNameWithExt = file.name.split(/[/\\]/).pop() || file.name;
      const archiveNo = fileNameWithExt.replace(/\.pdf$/i, '');

      // Check if archive number already exists
      const existingArchive = await prisma.archive.findUnique({
        where: { archiveNo },
      });

      if (existingArchive) {
        // Archive number already exists, skip this file
        await prisma.importRecord.update({
          where: { id: recordId },
          data: {
            status: "skipped",
            processed: 1,
            skipped: 1,
            fileName: file.name,
            errors: [{ archiveNo, reason: "档号已存在" }],
          },
        });

        // Log the skip
        await createLog({
          operator: operator,
          operation: "import_skipped",
          target: `PDF 入库跳过: ${archiveNo} (档号已存在)`,
          ip: clientIp,
        });

        return;
      }

      // Generate archiveID
      const archiveId = createId();

      // Calculate bucket path and ensure bucket directory exists
      const destPath = getPdfBucketFilePath(archiveNo, archiveId);
      const bucketDir = destPath.substring(0, destPath.lastIndexOf(require("path").sep));
      ensureBucketDir(bucketDir);

      console.log(`[Bucket Storage] Archive: ${archiveNo} -> Bucket: ${destPath.split("/").slice(-2).join("/")}`);

      // Copy and rename PDF file using optimized copy strategy
      await this.copyFileOptimized(file.path, destPath);

      // Create Archive record - only set archiveNo as per PRD requirement
      // Calculate fileUrl with bucket path for correct retrieval
      const bucketInfo = calculateBucketPath(archiveNo);
      const fileUrl = `/pdfs/${bucketInfo.bucketDirName}/${archiveId}.pdf`;

      const archive = await prisma.archive.create({
        data: {
          archiveID: archiveId,
          archiveNo: archiveNo,
          fondsNo: "",
          retentionPeriod: "",
          retentionCode: "",
          year: "",
          deptCode: "",
          boxNo: "",
          pieceNo: "",
          title: "",
          deptIssue: "",
          responsible: "",
          docNo: "",
          date: "",
          pageNo: "",
          remark: null,
          fileUrl: fileUrl,
          importRecordId: recordId,
        },
      });

      // Update import record as completed
      await prisma.importRecord.update({
        where: { id: recordId },
        data: {
          status: "completed",
          fileName: file.name,
          processed: 1,
        },
      });

      // Log operation
      await createLog({
        operator: operator,
        operation: "import",
        target: `PDF 入库: ${archive.archiveNo}`,
        ip: clientIp,
        archiveId: archive.archiveID,
      });

      // NOTE: Don't index to Meilisearch yet because all fields are empty
      // Indexing will happen after CSV import updates archive information
      // This ensures search functionality works with complete data
    } catch (error) {
      console.error(`Error processing import record ${recordId}:`, error);

      // Update import record as failed
      await prisma.importRecord.update({
        where: { id: recordId },
        data: {
          status: "failed",
          failed: 1,
          fileName: file.name,
        },
      });

      // Log the error
      await createLog({
        operator: operator,
        operation: "import_failed",
        target: `入库失败: ${file.name}`,
        ip: clientIp,
      });
    }
  }

  /**
   * Get import progress
   * @param recordId - Import record ID
   * @returns Progress percentage (0-100)
   */
  async getProgress(recordId: string): Promise<number> {
    const record = await prisma.importRecord.findUnique({
      where: { id: recordId },
    });

    if (!record) {
      throw new Error("Import record not found");
    }

    if (record.total === 0) return 0;
    return Math.round((record.processed / record.total) * 100);
  }

  /**
   * Get import record with details
   * @param recordId - Import record ID
   * @returns Import record with progress
   */
  async getImportRecord(recordId: string): Promise<ImportRecordWithProgress | null> {
    const record = await prisma.importRecord.findUnique({
      where: { id: recordId },
      include: {
        user: {
          select: { username: true },
        },
        archives: {
          take: 1,
        },
      },
    });

    if (!record) return null;

    const progress = record.total > 0 ? Math.round((record.processed / record.total) * 100) : 0;

    return {
      id: record.id,
      fileName: record.fileName || record.archives[0]?.title || "Unknown",
      archiveId: record.archives[0]?.archiveID || null,
      status: record.status as "pending" | "processing" | "completed" | "failed" | "cancelled" | "skipped",
      progress,
      error: null,
      operator: record.user.username,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      skipped: record.skipped,
    };
  }

  /**
   * Cancel an import operation
   * @param recordId - Import record ID
   */
  async cancelImport(recordId: string): Promise<void> {
    await prisma.importRecord.update({
      where: { id: recordId },
      data: { status: "cancelled" },
    });
  }

  /**
   * Get import history
   * @param params - Query parameters
   * @returns Import history response
   */
  async getHistory(params: ImportHistoryParams): Promise<ImportHistoryResponse> {
    const { page, pageSize, status, operator } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (operator) {
      where.user = {
        username: operator,
      };
    }

    const [records, total] = await Promise.all([
      prisma.importRecord.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { username: true },
          },
          archives: {
            take: 1,
          },
        },
      }),
      prisma.importRecord.count({ where }),
    ]);

    const items: ImportRecordWithProgress[] = records.map((record) => {
      const progress = record.total > 0 ? Math.round((record.processed / record.total) * 100) : 0;

      return {
        id: record.id,
        fileName: record.fileName || record.archives[0]?.title || "Unknown",
        archiveId: record.archives[0]?.archiveID || null,
        status: record.status as "pending" | "processing" | "completed" | "failed" | "cancelled" | "skipped",
        progress,
        error: null,
        operator: record.user.username,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        skipped: record.skipped,
      };
    });

    return {
      items,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get all current import records (for polling)
   * @returns Array of active import records
   */
  async getActiveImports(): Promise<ImportRecordWithProgress[]> {
    const records = await prisma.importRecord.findMany({
      where: {
        status: {
          in: ["pending", "processing"], // Only show actively processing records, exclude skipped/completed
        },
      },
      include: {
        user: {
          select: { username: true },
        },
        archives: {
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return records.map((record) => {
      const progress = record.total > 0 ? Math.round((record.processed / record.total) * 100) : 0;

      return {
        id: record.id,
        fileName: record.fileName || record.archives[0]?.title || "Unknown",
        archiveId: record.archives[0]?.archiveID || null,
        status: record.status as "pending" | "processing" | "completed" | "failed" | "cancelled" | "skipped",
        progress,
        error: null,
        operator: record.user.username,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        skipped: record.skipped,
      };
    });
  }

  /**
   * Set import concurrency (for runtime adjustment)
   * @param concurrency - Number of concurrent files to process
   */
  setConcurrency(concurrency: number): void {
    this.semaphore = new Semaphore(Math.max(1, Math.min(10, concurrency)));
    console.log(`Import concurrency set to: ${concurrency}`);
  }

  /**
   * Get current import configuration
   */
  getImportConfig(): {
    concurrency: number;
    storagePath: string;
  } {
    return {
      concurrency: IMPORT_CONCURRENCY,
      storagePath: PDF_STORAGE_PATH,
    };
  }
}

// Export singleton instance
export const importService = new ImportService();