"use server";

import { auth } from "@/auth";
import { importService, type PdfFile, type ImportHistoryParams } from "@/services/import.service";
import { createLog, getClientIp } from "@/services/log.service";
import { headers } from "next/headers";

/**
 * Scan folder for PDF files
 * @param folderPath - Path to the folder to scan
 * @returns Array of PDF files
 */
export async function scanFolderAction(folderPath: string) {
  const session = await auth();

  if (!session) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  if (session.user.role !== "admin") {
    return {
      success: false,
      error: "Forbidden: Admin access required",
    };
  }

  try {
    const files = await importService.scanFolder(folderPath);
    return {
      success: true,
      data: files.filter((f) => f.name.toLowerCase().endsWith(".pdf")),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to scan folder",
    };
  }
}

/**
 * Start import process for selected files
 * @param filePaths - Array of uploaded file paths to import
 * @returns Created import records
 */
export async function startImportAction(filePaths: Array<{ name: string; path: string; size: number }>) {
  const session = await auth();

  if (!session) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  if (session.user.role !== "admin") {
    return {
      success: false,
      error: "Forbidden: Admin access required",
    };
  }

  try {
    // Get client IP from headers
    const headersList = await headers();
    const clientIp = getClientIp({ headers: new Headers(headersList) } as Request);

    // Convert file paths to PdfFile format
    const files: PdfFile[] = filePaths.map(fp => ({
      name: fp.name,
      path: fp.path,
      size: fp.size,
    }));

    const records = await importService.startImport(files, session.user.username, clientIp);

    // Log the batch import operation
    await createLog({
      operator: session.user.username,
      operation: "import",
      target: `批量入库 ${files.length} 个文件`,
      ip: clientIp,
    });

    return {
      success: true,
      data: records,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to start import",
    };
  }
}

/**
 * Get import progress
 * @param recordId - Import record ID
 * @returns Progress percentage
 */
export async function getImportProgressAction(recordId: string) {
  const session = await auth();

  if (!session) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const record = await importService.getImportRecord(recordId);

    if (!record) {
      return {
        success: false,
        error: "Import record not found",
      };
    }

    return {
      success: true,
      data: {
        recordId: record.id,
        progress: record.progress,
        status: record.status,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get progress",
    };
  }
}

/**
 * Get all active import records (for polling)
 * @returns Array of active import records
 */
export async function getActiveImportsAction() {
  const session = await auth();

  if (!session) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const records = await importService.getActiveImports();

    return {
      success: true,
      data: records,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get active imports",
    };
  }
}

/**
 * Cancel an import operation
 * @param recordId - Import record ID to cancel
 * @returns Success status
 */
export async function cancelImportAction(recordId: string) {
  const session = await auth();

  if (!session) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  if (session.user.role !== "admin") {
    return {
      success: false,
      error: "Forbidden: Admin access required",
    };
  }

  try {
    await importService.cancelImport(recordId);

    // Log the cancellation
    await createLog({
      operator: session.user.username,
      operation: "cancel_import",
      target: `取消入库记录 ${recordId}`,
      ip: "",
    });

    return {
      success: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel import",
    };
  }
}

/**
 * Get import history
 * @param params - Query parameters
 * @returns Import history records
 */
export async function getImportHistoryAction(params: ImportHistoryParams) {
  const session = await auth();

  if (!session) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const history = await importService.getHistory(params);

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get import history",
    };
  }
}

/**
 * Get import history with pagination
 * @param page - Page number (1-based)
 * @param pageSize - Items per page
 * @param status - Optional status filter
 * @param operator - Optional operator filter
 * @returns Paginated import history
 */
export async function queryImportHistoryAction({
  page = 1,
  pageSize = 20,
  status,
  operator,
}: {
  page?: number;
  pageSize?: number;
  status?: string;
  operator?: string;
}) {
  const session = await auth();

  if (!session) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const result = await importService.getHistory({
      page,
      pageSize,
      status,
      operator,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to query import history",
    };
  }
}

/**
 * Get import processing statistics
 * @param operator - Username of operator (optional)
 * @returns Processing statistics
 */
export async function getProcessingStatsAction(operator?: string) {
  const session = await auth();

  if (!session) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const stats = await importService.getProcessingStats(
      session.user.role === "admin" ? operator : session.user.username
    );

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get processing stats",
    };
  }
}

/**
 * Set import concurrency (admin only)
 * @param concurrency - Number of concurrent files to process (1-10)
 * @returns Success status
 */
export async function setConcurrencyAction(concurrency: number) {
  const session = await auth();

  if (!session) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  if (session.user.role !== "admin") {
    return {
      success: false,
      error: "Forbidden: Admin access required",
    };
  }

  try {
    if (concurrency < 1 || concurrency > 10) {
      return {
        success: false,
        error: "Concurrency must be between 1 and 10",
      };
    }

    importService.setConcurrency(concurrency);

    // Log configuration change
    await createLog({
      operator: session.user.username,
      operation: "config_change",
      target: `设置导入并发数为: ${concurrency}`,
      ip: "",
    });

    return {
      success: true,
      data: {
        concurrency,
        message: `Import concurrency set to ${concurrency}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set concurrency",
    };
  }
}

/**
 * Get import configuration
 * @returns Current import configuration
 */
export async function getImportConfigAction() {
  const session = await auth();

  if (!session) {
    return {
      success: false,
      error: "Unauthorized",
    };
  }

  try {
    const config = importService.getImportConfig();

    return {
      success: true,
      data: config,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get import config",
    };
  }
}

/**
 * Upload CSV file and start import process
 * @param file - CSV file to upload
 * @returns Import record ID for tracking progress
 */
export async function uploadCsvAction(formData: FormData) {
  const session = await auth();

  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "管理员")) {
    return {
      success: false,
      error: "权限不足",
    };
  }

  try {
    const file = formData.get('file') as File;

    if (!file) {
      return {
        success: false,
        error: '请选择 CSV 文件',
      };
    }

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      return {
        success: false,
        error: '文件格式错误，请上传 CSV 文件',
      };
    }

    // Import CSV processing logic directly
    const { processCSVUpload } = await import("@/services/csv-import.service");
    const result = await processCSVUpload(file, session.user.username, session.user.id);

    return result;
  } catch (error) {
    console.error('[CSV Import Action] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'CSV 导入失败',
    };
  }
}
