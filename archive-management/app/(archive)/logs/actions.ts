"use server";

import { auth } from "@/auth";
import { queryLogs as queryLogsSvc, getStats, exportLogs, createLog, getClientIp, LogQueryParams } from "@/services/log.service";
import { setLogContext, clearLogContext } from "@/lib/prisma-middleware";

/**
 * Query operation logs
 */
export async function queryLogs(params: LogQueryParams) {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  try {
    const result = await queryLogsSvc(params);
    return result;
  } catch (error) {
    console.error("[Logs Actions] Failed to query logs:", error);
    throw new Error("Failed to query logs");
  }
}

/**
 * Get log statistics
 */
export async function getLogStats() {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  try {
    const stats = await getStats();
    return stats;
  } catch (error) {
    console.error("[Logs Actions] Failed to get stats:", error);
    throw new Error("Failed to get statistics");
  }
}

/**
 * Export logs to CSV
 */
export async function exportLogs(params: LogQueryParams) {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  try {
    const csv = await exportLogs(params);
    return csv;
  } catch (error) {
    console.error("[Logs Actions] Failed to export logs:", error);
    throw new Error("Failed to export logs");
  }
}

/**
 * Create a manual log entry
 */
export async function createManualLog(data: {
  operation: string;
  target: string;
  request?: Request;
}) {
  const session = await auth();

  if (!session) {
    throw new Error("Unauthorized");
  }

  try {
    const log = await createLog({
      operator: session.user.username || "unknown",
      operation: data.operation,
      target: data.target,
      ip: data.request ? getClientIp(data.request) : "unknown",
      userId: session.user.id,
    });

    return log;
  } catch (error) {
    console.error("[Logs Actions] Failed to create log:", error);
    throw new Error("Failed to create log");
  }
}
