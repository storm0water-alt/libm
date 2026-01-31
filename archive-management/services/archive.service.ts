import { prisma } from "@/lib/prisma";
import { indexArchive, deleteArchive as deleteFromIndex, batchIndexArchives } from "@/services/meilisearch.service";
import { createLog } from "@/services/log.service";
import { getCurrentOperator, getCurrentUserId } from "@/lib/prisma-middleware";

/**
 * Archive Service
 *
 * Provides CRUD operations for archive management with proper Chinese field names
 * matching the Prisma Archive model schema.
 *
 * Features:
 * - Full CRUD operations for archives
 * - Pagination and filtering
 * - Batch import/export
 * - Meilisearch integration
 * - Operation logging
 */

/**
 * Query parameters for listing archives
 */
export interface ArchiveQueryParams {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Optional search term (searches in title) */
  search?: string;
  /** Exact match filters */
  archiveNo?: string;
  fondsNo?: string;
  boxNo?: string;
  pieceNo?: string;
  /** Optional year filter */
  year?: string;
  /** Optional retention period filter */
  retentionPeriod?: string;
  /** Optional responsible person filter (keyword search) */
  responsible?: string;
  /** Date range filter */
  dateStart?: string;
  dateEnd?: string;
}

/**
 * Response from archive query operation
 */
export interface ArchiveListResponse {
  /** Array of archive items */
  items: ArchiveItem[];
  /** Total number of items matching the query */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Current page number */
  currentPage: number;
}

/**
 * Archive item type matching Prisma model
 */
export interface ArchiveItem {
  archiveID: string;
  archiveNo: string;
  fondsNo: string;
  retentionPeriod: string;
  retentionCode: string;
  year: string;
  deptCode: string;
  boxNo: string;
  pieceNo: string;
  title: string;
  deptIssue: string;
  responsible: string;
  docNo: string;
  date: string;
  pageNo: string;
  remark: string | null;
  fileUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input data for creating a new archive
 */
export interface CreateArchiveInput {
  archiveNo: string;
  fondsNo: string;
  retentionPeriod: string;
  retentionCode: string;
  year: string;
  deptCode: string;
  boxNo: string;
  pieceNo: string;
  title: string;
  deptIssue: string;
  responsible: string;
  docNo: string;
  date: string;
  pageNo: string;
  remark?: string;
  fileUrl?: string;
}

/**
 * Input data for updating an existing archive
 */
export interface UpdateArchiveInput {
  archiveNo?: string;
  fondsNo?: string;
  retentionPeriod?: string;
  retentionCode?: string;
  year?: string;
  deptCode?: string;
  boxNo?: string;
  pieceNo?: string;
  title?: string;
  deptIssue?: string;
  responsible?: string;
  docNo?: string;
  date?: string;
  pageNo?: string;
  remark?: string;
  fileUrl?: string;
}

/**
 * Query archives with pagination and filtering
 *
 * @param params - Query parameters (page, pageSize, search, fondsNo, year, etc.)
 * @returns Paginated list of archives
 *
 * @example
 * ```ts
 * const result = await queryArchives({
 *   page: 1,
 *   pageSize: 20,
 *   search: '会议',
 *   fondsNo: '001',
 *   year: '2024'
 * });
 * ```
 */
export async function queryArchives(
  params: ArchiveQueryParams
): Promise<ArchiveListResponse> {
  const {
    page,
    pageSize,
    search,
    archiveNo,
    fondsNo,
    boxNo,
    pieceNo,
    year,
    retentionPeriod,
    responsible,
    dateStart,
    dateEnd,
  } = params;

  // Build where clause - all filters use AND logic
  const where: any = {};

  // Search only in title (keyword search)
  if (search) {
    where.title = { contains: search, mode: "insensitive" };
  }

  // Exact match filters
  if (archiveNo) {
    where.archiveNo = archiveNo;
  }

  if (fondsNo) {
    where.fondsNo = fondsNo;
  }

  if (boxNo) {
    where.boxNo = boxNo;
  }

  if (pieceNo) {
    where.pieceNo = pieceNo;
  }

  if (year) {
    where.year = year;
  }

  if (retentionPeriod) {
    where.retentionPeriod = retentionPeriod;
  }

  // Responsible person keyword search
  if (responsible) {
    where.responsible = { contains: responsible, mode: "insensitive" };
  }

  // Date range filter
  if (dateStart || dateEnd) {
    where.date = {};
    if (dateStart) {
      where.date.gte = dateStart;
    }
    if (dateEnd) {
      where.date.lte = dateEnd;
    }
  }

  // Get total count
  const total = await prisma.archive.count({ where });

  // Calculate pagination
  const skip = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);

  // Get items
  // Optimized sorting: date (primary) + creation time (secondary)
  // String dates will be sorted alphabetically, which works for YYYY-MM-DD format
  // Empty/null dates appear last in desc order, which is desired behavior
  const items = await prisma.archive.findMany({
    where,
    skip,
    take: pageSize,
    orderBy: [
      { date: "desc" },     // Primary: archive date (YYYY-MM-DD format)
      { createdAt: "desc" }  // Secondary: creation time for tie-breaking
    ],
  });

  return {
    items,
    total,
    totalPages,
    currentPage: page,
  };
}

/**
 * Get archive by ID
 *
 * @param id - Archive ID (archiveID)
 * @returns Archive item or null if not found
 *
 * @example
 * ```ts
 * const archive = await getArchiveById('clx1234567890');
 * ```
 */
export async function getArchiveById(id: string): Promise<ArchiveItem | null> {
  return prisma.archive.findUnique({
    where: { archiveID: id },
  });
}

/**
 * Get archive by archive number (archiveNo)
 *
 * @param archiveNo - Archive number (business unique key)
 * @returns Archive item or null if not found
 *
 * @example
 * ```ts
 * const archive = await getArchiveByNo('2024-001-001-001');
 * ```
 */
export async function getArchiveByNo(archiveNo: string): Promise<ArchiveItem | null> {
  return prisma.archive.findUnique({
    where: { archiveNo },
  });
}

/**
 * Create a new archive
 *
 * @param data - Archive data
 * @param userId - User ID creating the archive
 * @returns Created archive
 *
 * @example
 * ```ts
 * const archive = await createArchive({
 *   archiveNo: '2024-001-001-001',
 *   fondsNo: '001',
 *   title: '会议纪要',
 *   // ... other fields
 * }, userId);
 * ```
 */
export async function createArchive(
  data: CreateArchiveInput,
  userId?: string
): Promise<ArchiveItem> {
  // Check if archive number already exists
  const existing = await prisma.archive.findUnique({
    where: { archiveNo: data.archiveNo },
  });

  if (existing) {
    throw new Error("档号已存在");
  }

  // Create archive (logging will be handled by Prisma middleware)
  const archive = await prisma.archive.create({
    data,
  });

  // Index in Meilisearch (non-blocking, fire and forget)
  indexArchive({
    id: archive.archiveID,
    title: archive.title,
    description: `${archive.deptIssue} - ${archive.responsible}`,
    category: archive.retentionPeriod,
    tags: [archive.fondsNo, archive.year, archive.deptIssue],
    // Additional metadata for search
    metadata: {
      archiveNo: archive.archiveNo,
      fondsNo: archive.fondsNo,
      year: archive.year,
      deptIssue: archive.deptIssue,
      responsible: archive.responsible,
      docNo: archive.docNo,
      date: archive.date,
    },
  }).catch((error) => {
    console.error("[Archive Service] Failed to index archive:", error);
  });

  return archive;
}

/**
 * Update an existing archive
 *
 * @param id - Archive ID (archiveID)
 * @param data - Update data
 * @param userId - User ID updating the archive
 * @returns Updated archive
 *
 * @example
 * ```ts
 * const archive = await updateArchive('clx1234567890', {
 *   title: '更新后的标题',
 *   remark: '备注信息'
 * }, userId);
 * ```
 */
export async function updateArchive(
  id: string,
  data: UpdateArchiveInput,
  userId?: string
): Promise<ArchiveItem> {
  // Check if new archive number conflicts with existing
  if (data.archiveNo) {
    const existing = await prisma.archive.findFirst({
      where: {
        archiveNo: data.archiveNo,
        archiveID: { not: id },
      },
    });

    if (existing) {
      throw new Error("档号已存在");
    }
  }

  // Update archive (logging will be handled by Prisma middleware)
  const archive = await prisma.archive.update({
    where: { archiveID: id },
    data,
  });

  // Update index in Meilisearch (non-blocking, fire and forget)
  indexArchive({
    id: archive.archiveID,
    title: archive.title,
    description: `${archive.deptIssue} - ${archive.responsible}`,
    category: archive.retentionPeriod,
    tags: [archive.fondsNo, archive.year, archive.deptIssue],
    metadata: {
      archiveNo: archive.archiveNo,
      fondsNo: archive.fondsNo,
      year: archive.year,
      deptIssue: archive.deptIssue,
      responsible: archive.responsible,
      docNo: archive.docNo,
      date: archive.date,
    },
  }).catch((error) => {
    console.error("[Archive Service] Failed to update index:", error);
  });

  return archive;
}

/**
 * Delete an archive
 *
 * @param id - Archive ID (archiveID)
 * @param userId - User ID deleting the archive
 * @returns Success status
 *
 * @example
 * ```ts
 * await deleteArchive('clx1234567890', userId);
 * ```
 */
export async function deleteArchive(id: string, userId?: string): Promise<void> {
  // Get archive for reference
  const archive = await prisma.archive.findUnique({
    where: { archiveID: id },
  });

  if (!archive) {
    throw new Error("档案不存在");
  }

  // Create operation log BEFORE deleting (due to foreign key constraint)
  const operator = getCurrentOperator() || "system";
  const ip = "unknown"; // IP should be passed from context if needed
  const target = `${archive.archiveNo}-${archive.title || "未命名"}`;

  await createLog({
    operator,
    operation: "delete",
    target,
    ip,
    archiveId: archive.archiveID,
    userId: getCurrentUserId() || userId,
  }).catch((error) => {
    console.error("[Archive Service] Failed to create delete log:", error);
  });

  // Delete archive
  await prisma.archive.delete({
    where: { archiveID: id },
  });

  // Delete from Meilisearch index (non-blocking, fire and forget)
  deleteFromIndex(id).catch((error) => {
    console.error("[Archive Service] Failed to delete from index:", error);
  });
}

/**
 * Batch delete archives
 *
 * @param ids - Array of archive IDs
 * @param userId - User ID deleting the archives
 * @returns Delete result with success count
 *
 * @example
 * ```ts
 * const result = await batchDeleteArchives(['id1', 'id2', 'id3'], userId);
 * console.log(result.successCount); // 3
 * ```
 */
export async function batchDeleteArchives(
  ids: string[],
  userId?: string
): Promise<{ successCount: number }> {
  let successCount = 0;

  for (const id of ids) {
    try {
      await deleteArchive(id, userId);
      successCount++;
    } catch (error) {
      console.error(`Failed to delete archive ${id}:`, error);
    }
  }

  return { successCount };
}

/**
 * Batch import archives
 *
 * @param archives - Array of archive data to import
 * @param userId - User ID importing the archives
 * @returns Import result with success/failed counts
 *
 * @example
 * ```ts
 * const result = await importArchives([
 *   { archiveNo: '2024-001-001-001', title: '档案1', ... },
 *   { archiveNo: '2024-001-001-002', title: '档案2', ... }
 * ], userId);
 * ```
 */
export async function importArchives(
  archives: CreateArchiveInput[],
  userId?: string
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  // Create import record
  const importRecord = await prisma.importRecord.create({
    data: {
      total: archives.length,
      processed: 0,
      failed: 0,
      status: "processing",
      userId: userId || "system",
    },
  });

  const createdArchives: any[] = [];

  for (let i = 0; i < archives.length; i++) {
    try {
      const archive = await createArchive(archives[i], userId);
      createdArchives.push(archive);
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(
        `${archives[i].title || archives[i].archiveNo}: ${error instanceof Error ? error.message : "导入失败"}`
      );
    }

    // Update progress
    await prisma.importRecord.update({
      where: { id: importRecord.id },
      data: {
        processed: i + 1,
        failed: results.failed,
        status: i === archives.length - 1 ? "completed" : "processing",
      },
    });
  }

  // Batch index all successfully created archives (non-blocking)
  if (createdArchives.length > 0) {
    batchIndexArchives(
      createdArchives.map((a) => ({
        id: a.archiveID,
        title: a.title,
        description: `${a.deptIssue} - ${a.responsible}`,
        category: a.retentionPeriod,
        tags: [a.fondsNo, a.year, a.deptIssue],
        metadata: {
          archiveNo: a.archiveNo,
          fondsNo: a.fondsNo,
          year: a.year,
          deptIssue: a.deptIssue,
          responsible: a.responsible,
          docNo: a.docNo,
          date: a.date,
        },
      }))
    ).catch((error) => {
      console.error("[Archive Service] Failed to batch index archives:", error);
    });
  }

  return results;
}

/**
 * Log archive view operation
 *
 * @param archiveId - Archive ID
 * @param operator - Operator name (username)
 * @param userId - User ID viewing the archive
 *
 * @example
 * ```ts
 * await logArchiveView('clx1234567890', 'john.doe', userId);
 * ```
 */
export async function logArchiveView(archiveId: string, operator?: string, userId?: string): Promise<void> {
  const archive = await prisma.archive.findUnique({
    where: { archiveID: archiveId },
  });

  if (!archive) return;

  await prisma.operationLog.create({
    data: {
      operator: operator || "system",
      operation: "view",
      target: `查看档案: ${archive.title} (${archive.archiveNo})`,
      userId,
      archiveId,
    },
  });
}

/**
 * Log archive download operation
 *
 * @param archiveId - Archive ID
 * @param operator - Operator name (username)
 * @param userId - User ID downloading the archive
 *
 * @example
 * ```ts
 * await logArchiveDownload('clx1234567890', 'john.doe', userId);
 * ```
 */
export async function logArchiveDownload(archiveId: string, operator?: string, userId?: string): Promise<void> {
  const archive = await prisma.archive.findUnique({
    where: { archiveID: archiveId },
  });

  if (!archive) return;

  await prisma.operationLog.create({
    data: {
      operator: operator || "system",
      operation: "download",
      target: `下载档案: ${archive.title} (${archive.archiveNo})`,
      userId,
      archiveId,
    },
  });
}

/**
 * Get unique values for filter fields
 *
 * Returns distinct values for fondsNo, year, retentionPeriod, deptIssue
 * Useful for building filter dropdowns
 *
 * @returns Object with arrays of unique values
 *
 * @example
 * ```ts
 * const filters = await getArchiveFilters();
 * console.log(filters.fondsNo); // ['001', '002', '003']
 * console.log(filters.years); // ['2024', '2023', '2022']
 * ```
 */
export async function getArchiveFilters(): Promise<{
  fondsNo: string[];
  years: string[];
  retentionPeriods: string[];
  deptIssues: string[];
}> {
  const [fondsNoResult, yearsResult, retentionPeriodsResult, deptIssuesResult] = await Promise.all([
    prisma.archive.findMany({
      select: { fondsNo: true },
      distinct: ["fondsNo"],
      orderBy: { fondsNo: "asc" },
    }),
    prisma.archive.findMany({
      select: { year: true },
      distinct: ["year"],
      orderBy: { year: "desc" },
    }),
    prisma.archive.findMany({
      select: { retentionPeriod: true },
      distinct: ["retentionPeriod"],
      orderBy: { retentionPeriod: "asc" },
    }),
    prisma.archive.findMany({
      select: { deptIssue: true },
      distinct: ["deptIssue"],
      orderBy: { deptIssue: "asc" },
    }),
  ]);

  return {
    fondsNo: fondsNoResult.map((f) => f.fondsNo),
    years: yearsResult.map((f) => f.year),
    retentionPeriods: retentionPeriodsResult.map((f) => f.retentionPeriod),
    deptIssues: deptIssuesResult.map((f) => f.deptIssue),
  };
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
 * const stats = await getArchiveStats();
 * console.log(stats.total); // Total number of archives
 * console.log(stats.byYear); // Archives grouped by year
 * ```
 */
export async function getArchiveStats(): Promise<{
  total: number;
  byYear: Record<string, number>;
  byFondsNo: Record<string, number>;
  byRetentionPeriod: Record<string, number>;
}> {
  const [total, byYear, byFondsNo, byRetentionPeriod] = await Promise.all([
    prisma.archive.count(),
    prisma.archive.groupBy({
      by: ["year"],
      _count: true,
      orderBy: { year: "desc" },
    }),
    prisma.archive.groupBy({
      by: ["fondsNo"],
      _count: true,
      orderBy: { fondsNo: "asc" },
    }),
    prisma.archive.groupBy({
      by: ["retentionPeriod"],
      _count: true,
      orderBy: { retentionPeriod: "asc" },
    }),
  ]);

  return {
    total,
    byYear: byYear.reduce((acc, item) => {
      acc[item.year] = item._count;
      return acc;
    }, {} as Record<string, number>),
    byFondsNo: byFondsNo.reduce((acc, item) => {
      acc[item.fondsNo] = item._count;
      return acc;
    }, {} as Record<string, number>),
    byRetentionPeriod: byRetentionPeriod.reduce((acc, item) => {
      acc[item.retentionPeriod] = item._count;
      return acc;
    }, {} as Record<string, number>),
  };
}
