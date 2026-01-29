"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  queryArchives as queryArchivesSvc,
  getArchiveById,
  createArchive as createArchiveSvc,
  updateArchive as updateArchiveSvc,
  deleteArchive as deleteArchiveSvc,
  batchDeleteArchives as batchDeleteArchivesSvc,
  getArchiveFilters,
  getArchiveStats,
  logArchiveView,
  logArchiveDownload,
  type CreateArchiveInput,
  type UpdateArchiveInput,
  type ArchiveQueryParams,
} from "@/services/archive.service";
import { setLogContext, clearLogContext } from "@/lib/prisma-middleware";
import { getClientIp } from "@/services/log.service";
import { headers } from "next/headers";

/**
 * Response wrapper for server actions
 */
interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Query archives with pagination and filtering
 *
 * @param params - Query parameters including page, pageSize, search, and filters
 * @returns Paginated list of archives
 *
 * @example
 * ```ts
 * const result = await queryArchivesAction({
 *   page: 1,
 *   pageSize: 20,
 *   search: '会议',
 *   fondsNo: '001',
 *   year: '2024'
 * });
 * ```
 */
export async function queryArchivesAction(params: ArchiveQueryParams): Promise<ActionResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "未登录",
      };
    }

    // Validate parameters
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));

    // Query archives
    const result = await queryArchivesSvc({
      page,
      pageSize,
      search: params.search,
      archiveNo: params.archiveNo,
      fondsNo: params.fondsNo,
      boxNo: params.boxNo,
      pieceNo: params.pieceNo,
      year: params.year,
      retentionPeriod: params.retentionPeriod,
      responsible: params.responsible,
      dateStart: params.dateStart,
      dateEnd: params.dateEnd,
      deptIssue: params.deptIssue,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[Archive Actions] Failed to query archives:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "查询档案失败",
    };
  }
}

/**
 * Get archive by ID
 *
 * @param id - Archive ID (archiveID)
 * @returns Archive item
 *
 * @example
 * ```ts
 * const result = await getArchiveByIdAction('clx1234567890');
 * ```
 */
export async function getArchiveByIdAction(id: string): Promise<ActionResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "未登录",
      };
    }

    // Validate ID
    if (!id || id.length < 1) {
      return {
        success: false,
        error: "档案ID无效",
      };
    }

    // Get archive
    const archive = await getArchiveById(id);

    if (!archive) {
      return {
        success: false,
        error: "档案不存在",
      };
    }

    // Log view
    const headersList = await headers();
    const clientIp = getClientIp({ headers: new Headers(headersList) } as Request);
    await logArchiveView(id, session.user.username || session.user.name || 'user', session.user.id, clientIp);

    return {
      success: true,
      data: archive,
    };
  } catch (error) {
    console.error("[Archive Actions] Failed to get archive:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取档案失败",
    };
  }
}

/**
 * Create a new archive
 *
 * @param data - Archive data
 * @returns Created archive
 *
 * @example
 * ```ts
 * const result = await createArchiveAction({
 *   archiveNo: '2024-001-001-001',
 *   fondsNo: '001',
 *   title: '会议纪要',
 *   // ... other fields
 * });
 * ```
 */
export async function createArchiveAction(data: CreateArchiveInput): Promise<ActionResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "未登录",
      };
    }

    // Admin role required
    if (session.user.role !== "admin") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Validate required fields
    const requiredFields = [
      "archiveNo",
      "fondsNo",
      "retentionPeriod",
      "retentionCode",
      "year",
      "deptCode",
      "boxNo",
      "pieceNo",
      "title",
      "deptIssue",
      "responsible",
      "docNo",
      "date",
      "pageNo",
    ] as const;

    for (const field of requiredFields) {
      if (!data[field]) {
        return {
          success: false,
          error: `${field} 是必填字段`,
        };
      }
    }

    // Validate archive number format (optional, adjust as needed)
    const archiveNoSchema = z.string().min(1, "档号不能为空").max(100, "档号不能超过100个字符");
    const archiveNoResult = archiveNoSchema.safeParse(data.archiveNo);
    if (!archiveNoResult.success) {
      return {
        success: false,
        error: archiveNoResult.error.errors[0].message,
      };
    }

    // Validate title length
    if (data.title.length > 200) {
      return {
        success: false,
        error: "题名不能超过200个字符",
      };
    }

    // Set log context for automatic logging via Prisma middleware
    const headersList = await headers();
    const clientIp = getClientIp({ headers: new Headers(headersList) } as Request);
    setLogContext(session.user.username || session.user.name || 'user', session.user.id, undefined, clientIp);

    try {
      // Create archive
      const archive = await createArchiveSvc(data, session.user.id);

      // Revalidate cache
      revalidatePath("/archives");

      return {
        success: true,
        data: archive,
      };
    } finally {
      // Clear log context
      clearLogContext();
    }
  } catch (error) {
    console.error("[Archive Actions] Failed to create archive:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建档案失败",
    };
  }
}

/**
 * Update an existing archive
 *
 * @param id - Archive ID (archiveID)
 * @param data - Update data
 * @returns Updated archive
 *
 * @example
 * ```ts
 * const result = await updateArchiveAction('clx1234567890', {
 *   title: '更新后的标题',
 *   remark: '备注信息'
 * });
 * ```
 */
export async function updateArchiveAction(
  id: string,
  data: UpdateArchiveInput
): Promise<ActionResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "未登录",
      };
    }

    // Admin role required
    if (session.user.role !== "admin") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Validate ID
    if (!id || id.length < 1) {
      return {
        success: false,
        error: "档案ID无效",
      };
    }

    // Check if archive exists
    const existing = await getArchiveById(id);
    if (!existing) {
      return {
        success: false,
        error: "档案不存在",
      };
    }

    // Validate archive number if provided
    if (data.archiveNo) {
      const archiveNoSchema = z.string().min(1, "档号不能为空").max(100, "档号不能超过100个字符");
      const archiveNoResult = archiveNoSchema.safeParse(data.archiveNo);
      if (!archiveNoResult.success) {
        return {
          success: false,
          error: archiveNoResult.error.errors[0].message,
        };
      }
    }

    // Validate title length if provided
    if (data.title && data.title.length > 200) {
      return {
        success: false,
        error: "题名不能超过200个字符",
      };
    }

    // Set log context for automatic logging via Prisma middleware
    const headersList = await headers();
    const clientIp = getClientIp({ headers: new Headers(headersList) } as Request);
    setLogContext(session.user.username || session.user.name || 'user', session.user.id, undefined, clientIp);

    try {
      // Update archive
      const archive = await updateArchiveSvc(id, data, session.user.id);

      // Revalidate cache
      revalidatePath("/archives");

      return {
        success: true,
        data: archive,
      };
    } finally {
      // Clear log context
      clearLogContext();
    }
  } catch (error) {
    console.error("[Archive Actions] Failed to update archive:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "更新档案失败",
    };
  }
}

/**
 * Delete an archive
 *
 * @param id - Archive ID (archiveID)
 * @returns Success status
 *
 * @example
 * ```ts
 * const result = await deleteArchiveAction('clx1234567890');
 * ```
 */
export async function deleteArchiveAction(id: string): Promise<ActionResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "未登录",
      };
    }

    // Admin role required
    if (session.user.role !== "admin") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Validate ID
    if (!id || id.length < 1) {
      return {
        success: false,
        error: "档案ID无效",
      };
    }

    // Set log context for automatic logging via Prisma middleware
    const headersList = await headers();
    const clientIp = getClientIp({ headers: new Headers(headersList) } as Request);
    setLogContext(session.user.username || session.user.name || 'user', session.user.id, undefined, clientIp);

    try {
      // Delete archive
      await deleteArchiveSvc(id, session.user.id);

      // Revalidate cache
      revalidatePath("/archives");

      return {
        success: true,
      };
    } finally {
      // Clear log context
      clearLogContext();
    }
  } catch (error) {
    console.error("[Archive Actions] Failed to delete archive:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除档案失败",
    };
  }
}

/**
 * Batch delete archives
 *
 * @param ids - Array of archive IDs
 * @returns Delete result with success count
 *
 * @example
 * ```ts
 * const result = await batchDeleteArchivesAction(['id1', 'id2', 'id3']);
 * console.log(result.data); // { successCount: 3 }
 * ```
 */
export async function batchDeleteArchivesAction(ids: string[]): Promise<ActionResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "未登录",
      };
    }

    // Admin role required
    if (session.user.role !== "admin") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Validate IDs
    if (!Array.isArray(ids) || ids.length === 0) {
      return {
        success: false,
        error: "请选择要删除的档案",
      };
    }

    if (ids.length > 100) {
      return {
        success: false,
        error: "单次最多删除100条档案",
      };
    }

    // Set log context for automatic logging via Prisma middleware
    const headersList = await headers();
    const clientIp = getClientIp({ headers: new Headers(headersList) } as Request);
    setLogContext(session.user.username || session.user.name || 'user', session.user.id, undefined, clientIp);

    try {
      // Batch delete
      const result = await batchDeleteArchivesSvc(ids, session.user.id);

      // Revalidate cache
      revalidatePath("/archives");

      return {
        success: true,
        data: result,
      };
    } finally {
      // Clear log context
      clearLogContext();
    }
  } catch (error) {
    console.error("[Archive Actions] Failed to batch delete archives:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "批量删除档案失败",
    };
  }
}

/**
 * Get archive filters
 *
 * Returns distinct values for fondsNo, year, retentionPeriod, deptIssue
 * Useful for building filter dropdowns
 *
 * @returns Object with arrays of unique values
 *
 * @example
 * ```ts
 * const result = await getArchiveFiltersAction();
 * console.log(result.data); // { fondsNo: ['001', '002'], years: ['2024', '2023'], ... }
 * ```
 */
export async function getArchiveFiltersAction(): Promise<ActionResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "未登录",
      };
    }

    // Get filters
    const filters = await getArchiveFilters();

    return {
      success: true,
      data: filters,
    };
  } catch (error) {
    console.error("[Archive Actions] Failed to get archive filters:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取筛选条件失败",
    };
  }
}

/**
 * Get archive statistics
 *
 * Returns count statistics grouped by various fields
 *
 * @returns Object with statistics
 *
 * @example
 * ```ts
 * const result = await getArchiveStatsAction();
 * console.log(result.data); // { total: 1000, byYear: {...}, ... }
 * ```
 */
export async function getArchiveStatsAction(): Promise<ActionResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "未登录",
      };
    }

    // Admin role required for stats
    if (session.user.role !== "admin") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Get stats
    const stats = await getArchiveStats();

    return {
      success: true,
      data: stats,
    };
  } catch (error) {
    console.error("[Archive Actions] Failed to get archive stats:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取统计数据失败",
    };
  }
}

/**
 * Log archive download operation
 *
 * @param archiveId - Archive ID
 * @returns Success status
 *
 * @example
 * ```ts
 * const result = await logArchiveDownloadAction('clx1234567890');
 * ```
 */
export async function logArchiveDownloadAction(archiveId: string): Promise<ActionResult> {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return {
        success: false,
        error: "未登录",
      };
    }

    // Validate ID
    if (!archiveId || archiveId.length < 1) {
      return {
        success: false,
        error: "档案ID无效",
      };
    }

    // Log download
    const headersList = await headers();
    const clientIp = getClientIp({ headers: new Headers(headersList) } as Request);
    await logArchiveDownload(archiveId, session.user.username || session.user.name || 'user', session.user.id, clientIp);

    return {
      success: true,
    };
  } catch (error) {
    console.error("[Archive Actions] Failed to log archive download:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "记录下载操作失败",
    };
  }
}
