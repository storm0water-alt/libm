import { prisma } from "@/lib/prisma";
import { getIndex, checkHealth } from "@/lib/meilisearch";
import type { Archive, Prisma } from "@prisma/client";

/**
 * TypeScript interfaces for Meilisearch operations
 */

export interface SearchFilters {
  fondsNo?: string;
  /** 保管期限 */
  retentionPeriod?: string;
  /** 年度 */
  year?: string;
  /** 机构问题代码 */
  deptCode?: string;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  /** 结构化筛选条件（字段需在 Meilisearch 的 filterableAttributes 中） */
  filters?: SearchFilters;
}

export interface ArchiveSearchDocument {
  id: string;
  archiveNo: string;
  title: string;
  deptIssue: string;
  responsible: string;
  docNo: string;
  remark: string | null;
  fondsNo: string;
  retentionPeriod: string;
  year: string;
  deptCode: string;
  createdAt: string;
}

export interface SearchResult<T = unknown> {
  hits: T[];
  estimatedTotalHits: number;
  limit: number;
  offset: number;
  processingTimeMs: number;
}

export interface SearchResponse {
  results: Archive[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  query: string;
  processingTimeMs: number;
}

/**
 * 把筛选条件转成 Meilisearch 的 filter 表达式
 * 例：{ year: "2024", fondsNo: "A01" } -> ['year = "2024"', 'fondsNo = "A01"']
 */
function buildMeilisearchFilter(filters?: SearchFilters): string[] | undefined {
  if (!filters) return undefined;

  const conditions = Object.entries(filters)
    .filter(([, value]) => typeof value === "string" && value.length > 0)
    .map(([field, value]) => `${field} = ${JSON.stringify(value)}`);

  return conditions.length > 0 ? conditions : undefined;
}

/**
 * 把筛选条件转成 Prisma 的 where 片段（Meilisearch 不可用时的降级路径）
 */
function buildPrismaFilter(filters?: SearchFilters): Prisma.ArchiveWhereInput {
  const where: Prisma.ArchiveWhereInput = {};
  if (!filters) return where;

  for (const field of ["fondsNo", "retentionPeriod", "year", "deptCode"] as const) {
    const value = filters[field];
    if (typeof value === "string" && value.length > 0) {
      where[field] = value;
    }
  }

  return where;
}

/**
 * 建立索引所需的 Archive 字段子集（Archive 与 ArchiveItem 均满足）
 */
export type ArchiveDocumentSource = Pick<
  Archive,
  | "archiveID"
  | "archiveNo"
  | "title"
  | "deptIssue"
  | "responsible"
  | "docNo"
  | "remark"
  | "fondsNo"
  | "retentionPeriod"
  | "year"
  | "deptCode"
  | "createdAt"
>;

/**
 * Convert Archive model to ArchiveSearchDocument
 */
function archiveToDocument(archive: ArchiveDocumentSource): ArchiveSearchDocument {
  return {
    id: archive.archiveID,
    archiveNo: archive.archiveNo || "",
    title: archive.title,
    deptIssue: archive.deptIssue || "",
    responsible: archive.responsible || "",
    docNo: archive.docNo || "",
    remark: archive.remark,
    fondsNo: archive.fondsNo,
    retentionPeriod: archive.retentionPeriod,
    year: archive.year,
    deptCode: archive.deptCode,
    createdAt: archive.createdAt.toISOString(),
  };
}

/**
 * Search archives using Meilisearch
 * Falls back to Prisma if Meilisearch is unavailable
 */
export async function searchArchives(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  try {
    // Check if Meilisearch is healthy
    const health = await checkHealth();
    if (!health.healthy) {
      console.warn("[Meilisearch] Service unhealthy, falling back to Prisma");
      return await searchWithPrisma(query, options);
    }

    const index = await getIndex();
    const limit = options.limit || 20;
    const offset = options.offset || 0;

    // Perform search
    const searchParams: { limit: number; offset: number; filter?: string[] } = {
      limit,
      offset,
    };
    const filter = buildMeilisearchFilter(options.filters);
    if (filter) {
      searchParams.filter = filter;
    }

    const results = await index.search<ArchiveSearchDocument>(
      query,
      searchParams
    );

    // Get full archive details from database
    const archiveIds = results.hits.map((hit) => hit.id);
    const archives = await prisma.archive.findMany({
      where: {
        archiveID: { in: archiveIds },
      },
    });

    // Sort archives according to search results order
    const orderedArchives = archiveIds
      .map((id) => archives.find((a) => a.archiveID === id))
      .filter((a): a is Archive => a !== undefined);

    return {
      results: orderedArchives,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: results.estimatedTotalHits,
        totalPages: Math.ceil(results.estimatedTotalHits / limit),
      },
      query,
      processingTimeMs: results.processingTimeMs,
    };
  } catch (error) {
    console.error("[Meilisearch] Search error:", error);
    console.warn("[Meilisearch] Falling back to Prisma search");
    return await searchWithPrisma(query, options);
  }
}

/**
 * Fallback to Prisma-based search
 */
async function searchWithPrisma(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const startTime = Date.now();
  const limit = options.limit || 20;
  const offset = options.offset || 0;

  // Search in multiple fields
  const where: Prisma.ArchiveWhereInput = {
    ...buildPrismaFilter(options.filters),
    OR: [
      { title: { contains: query, mode: "insensitive" } },
      { archiveNo: { contains: query, mode: "insensitive" } },
      { deptIssue: { contains: query, mode: "insensitive" } },
      { responsible: { contains: query, mode: "insensitive" } },
      { docNo: { contains: query, mode: "insensitive" } },
      { remark: { contains: query, mode: "insensitive" } },
    ],
  };

  const [archives, total] = await Promise.all([
    prisma.archive.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.archive.count({ where }),
  ]);

  return {
    results: archives,
    pagination: {
      page: Math.floor(offset / limit) + 1,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    query,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Add or update archive in Meilisearch index
 */
export async function indexArchive(archive: ArchiveDocumentSource): Promise<{
  success: boolean;
  error?: string;
}> {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      const index = await getIndex();
      const document = archiveToDocument(archive);

      await index.updateDocuments([document]);

      return { success: true };
    } catch (error) {
      retries++;
      const delay = Math.pow(2, retries) * 100; // 100ms, 200ms, 400ms

      console.error(
        `[Meilisearch] Index error (attempt ${retries}/${maxRetries}):`,
        error
      );

      if (retries >= maxRetries) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return { success: false, error: "Max retries exceeded" };
}

/**
 * Delete archive from Meilisearch index
 */
export async function deleteArchive(archiveId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const index = await getIndex();
    await index.deleteDocument(archiveId);

    return { success: true };
  } catch (error) {
    console.error("[Meilisearch] Delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Batch index multiple archives
 */
export async function batchIndexArchives(archives: ArchiveDocumentSource[]): Promise<{
  success: boolean;
  indexed: number;
  failed: number;
  errors: string[];
}> {
  const batchSize = 100;
  let indexed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < archives.length; i += batchSize) {
    const batch = archives.slice(i, i + batchSize);

    try {
      const index = await getIndex();
      const documents = batch.map(archiveToDocument);

      await index.updateDocuments(documents);

      indexed += batch.length;
    } catch (error) {
      failed += batch.length;
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      errors.push(`Batch ${i / batchSize + 1}: ${errorMsg}`);
      console.error(`[Meilisearch] Batch index error:`, errorMsg);
    }
  }

  return {
    success: failed === 0,
    indexed,
    failed,
    errors,
  };
}

/**
 * Configure Meilisearch index settings
 */
export async function configureIndexSettings(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const index = await getIndex();

    const settings = {
      searchableAttributes: [
        "title",
        "archiveNo",
        "docNo",
        "deptIssue",
        "responsible",
        "remark",
        "fondsNo",
        "retentionPeriod",
      ],
      filterableAttributes: ["fondsNo", "retentionPeriod", "year", "deptCode"],
      sortableAttributes: ["createdAt", "title"],
      rankingRules: [
        "words",
        "typo",
        "proximity",
        "attribute",
        "sort",
        "exactness",
      ],
      displayedAttributes: ["*"],
      typoTolerance: {
        enabled: true,
        minWordSizeForTypos: {
          oneTypo: 4,
          twoTypos: 8,
        },
      },
      stopWords: [],
      synonyms: {},
    };

    await index.updateSettings(settings);

    return { success: true };
  } catch (error) {
    console.error("[Meilisearch] Configure settings error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get Meilisearch index statistics
 */
export async function getSearchStats(): Promise<{
  numberOfDocuments: number | null;
  isIndexing: boolean | null;
  fieldDistribution: Record<string, number> | null;
  lastUpdate: string | null;
} | null> {
  try {
    const index = await getIndex();
    const stats = await index.getStats();

    return {
      numberOfDocuments: stats.numberOfDocuments,
      isIndexing: stats.isIndexing,
      fieldDistribution: stats.fieldDistribution,
      lastUpdate: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[Meilisearch] Get stats error:", error);
    return null;
  }
}

/**
 * Initialize Meilisearch index with all existing archives
 */
export async function initializeMeilisearch(): Promise<{
  success: boolean;
  error?: string;
  indexed?: number;
}> {
  try {
    // First, configure index settings
    const settingsResult = await configureIndexSettings();
    if (!settingsResult.success) {
      return {
        success: false,
        error: `Failed to configure settings: ${settingsResult.error}`,
      };
    }

    // Get all archives from database
    const archives = await prisma.archive.findMany({
      orderBy: { createdAt: "desc" },
    });

    if (archives.length === 0) {
      return {
        success: true,
        indexed: 0,
      };
    }

    // Index all archives
    const result = await batchIndexArchives(archives);

    return {
      success: result.failed === 0,
      indexed: result.indexed,
      error: result.errors.length > 0 ? result.errors.join("; ") : undefined,
    };
  } catch (error) {
    console.error("[Meilisearch] Initialize error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
