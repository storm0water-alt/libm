import { prisma } from "@/lib/prisma";
import { mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { createId } from "@paralleldrive/cuid2";
import { createLog } from "./log.service";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

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
 */
const PDF_STORAGE_PATH = process.env.PDF_STORAGE_PATH || "./public/pdfs";

/**
 * Import concurrency configuration
 */
const IMPORT_CONCURRENCY = parseInt(process.env.IMPORT_CONCURRENCY || "3");

/**
 * Ensure PDF storage directory exists
 */
async function ensureStorageDir(): Promise<void> {
  if (!existsSync(PDF_STORAGE_PATH)) {
    await mkdir(PDF_STORAGE_PATH, { recursive: true });
  }
}

/**
 * Import Service Class
 */
class ImportService {
  private semaphore: Semaphore;

  constructor() {
    this.semaphore = new Semaphore(IMPORT_CONCURRENCY);
  }

  /**
   * Scan a folder for PDF files
   * @param folderPath - Path to folder to scan
   * @returns Array of PDF file information
   */
  async scanFolder(folderPath: string): Promise<PdfFile[]> {
    try {
      const { readdir } = await import("fs/promises");
      const { stat } = await import("fs/promises");

      const files = await readdir(folderPath);
      const pdfFiles: PdfFile[] = [];

      for (const file of files) {
        if (file.toLowerCase().endsWith(".pdf")) {
          const fullPath = join(folderPath, file);
          const stats = await stat(fullPath);

          pdfFiles.push({
            name: file,
            path: fullPath,
            size: stats.size,
          });
        }
      }

      return pdfFiles;
    } catch (error) {
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
   * Optimized file copy strategy
   * @param source - Source file path
   * @param dest - Destination file path
   */
  private async copyFileOptimized(source: string, dest: string): Promise<void> {
    try {
      const stats = await import("fs/promises").then(fs => fs.stat(source));
      const fileSize = stats.size;

      if (fileSize > 50 * 1024 * 1024) {
        // Large files: Use rsync
        await execAsync(`rsync -av "${source}" "${dest}"`);
      } else {
        // Small/medium files: Use cp command
        await execAsync(`cp "${source}" "${dest}"`);
      }
    } catch (error) {
      console.error("Copy failed, using fallback:", error);
      // Fallback to Node.js copyFile
      const { copyFile } = await import("fs/promises");
      await copyFile(source, dest);
    }
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
      // Update status to processing
      await prisma.importRecord.update({
        where: { id: recordId },
        data: { status: "processing" },
      });

      // Generate archive number (档号) - using filename without extension
      const archiveNo = file.name.replace(/\.pdf$/i, '');

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
            skipped: 1, // Increment skipped count
            fileName: file.name,
            // Store skip reason in errors field
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

        console.log(`[Import Service] Skipped existing archive number: ${archiveNo}`);
        return;
      }

      // Generate archiveID
      const archiveId = createId();

      // Ensure storage directory exists
      await ensureStorageDir();

      // Copy and rename PDF file using optimized copy strategy
      const destPath = join(PDF_STORAGE_PATH, `${archiveId}.pdf`);
      await this.copyFileOptimized(file.path, destPath);

      // Create Archive record - only set archiveNo as per PRD requirement
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
          fileUrl: `/pdfs/${archiveId}.pdf`,
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