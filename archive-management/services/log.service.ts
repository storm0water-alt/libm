import { prisma } from "@/lib/prisma";

export interface CreateLogInput {
  operator: string;
  operation: string;
  target: string;
  ip: string;
  archiveId?: string;
  userId?: string;
}

export interface LogQueryParams {
  page: number;
  pageSize: number;
  filters: {
    operation?: string;
    startDate?: Date;
    endDate?: Date;
    operator?: string;
  };
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface LogListResponse {
  data: any[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LogStats {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  operationDistribution: Record<string, number>;
}

/**
 * Create a new operation log
 */
export async function createLog(data: CreateLogInput) {
  try {
    const log = await prisma.operationLog.create({
      data: {
        operator: data.operator,
        operation: data.operation,
        target: data.target,
        ip: data.ip,
        archiveId: data.archiveId,
        userId: data.userId,
        // Legacy fields for backward compatibility
        action: data.operation,
        entityType: data.archiveId ? "archive" : "system",
        entityId: data.archiveId || "system",
        description: data.target,
      },
    });

    return log;
  } catch (error) {
    console.error("[Log Service] Failed to create log:", error);
    // Don't throw error - logging failures should not break operations
    return null;
  }
}

/**
 * Query logs with pagination and filtering
 */
export async function queryLogs(params: LogQueryParams): Promise<LogListResponse> {
  const { page, pageSize, filters, sortBy = "time", sortOrder = "desc" } = params;
  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: any = {};

  if (filters.operation) {
    where.operation = filters.operation;
  }

  if (filters.startDate || filters.endDate) {
    where.time = {};
    if (filters.startDate) {
      where.time.gte = filters.startDate;
    }
    if (filters.endDate) {
      where.time.lte = filters.endDate;
    }
  }

  if (filters.operator) {
    where.operator = {
      contains: filters.operator,
      mode: "insensitive",
    };
  }

  // Get logs with pagination
  const [logs, total] = await Promise.all([
    prisma.operationLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        archive: {
          select: {
            archiveID: true,
            archiveNo: true,
            title: true,
          },
        },
      },
    }),
    prisma.operationLog.count({ where }),
  ]);

  return {
    data: logs,
    total,
    page,
    pageSize,
  };
}

/**
 * Get log statistics
 */
export async function getStats(): Promise<LogStats> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get counts for different time ranges
  const [todayCount, weekCount, monthCount, allLogs] = await Promise.all([
    prisma.operationLog.count({
      where: {
        time: { gte: today },
      },
    }),
    prisma.operationLog.count({
      where: {
        time: { gte: weekAgo },
      },
    }),
    prisma.operationLog.count({
      where: {
        time: { gte: monthAgo },
      },
    }),
    prisma.operationLog.findMany({
      where: {
        time: { gte: monthAgo },
      },
      select: {
        operation: true,
      },
    }),
  ]);

  // Calculate operation distribution
  const operationDistribution: Record<string, number> = {
    delete: 0,
    modify: 0,
    download: 0,
    import: 0,
    login: 0,
    logout: 0,
    create: 0,
    view: 0,
  };

  allLogs.forEach((log) => {
    const operation = log.operation || "unknown";
    operationDistribution[operation] = (operationDistribution[operation] || 0) + 1;
  });

  return {
    todayCount,
    weekCount,
    monthCount,
    operationDistribution,
  };
}

/**
 * Export logs to CSV format
 */
export async function exportLogs(params: LogQueryParams): Promise<string> {
  // Set a larger page size for export
  const exportParams = {
    ...params,
    pageSize: 10000, // Export up to 10,000 records
  };

  const { data } = await queryLogs(exportParams);

  // CSV headers (Chinese)
  const headers = ["时间", "操作人", "操作类型", "目标对象", "IP地址"];

  // Format data rows
  const rows = data.map((log) => [
    formatDateTime(log.time),
    log.operator,
    log.operation,
    log.target,
    log.ip,
  ]);

  // Build CSV string
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\n");

  // Add BOM for Excel compatibility
  return "\uFEFF" + csvContent;
}

/**
 * Format date for display
 */
function formatDateTime(date: Date): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get client IP address from request headers
 */
export function getClientIp(request: Request): string {
  // Try various headers for IP address
  const headers = request.headers;

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  const cfConnectingIp = headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return "unknown";
}
