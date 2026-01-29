import { Prisma } from "@prisma/client";
import { createLog, getClientIp } from "@/services/log.service";

// Store request context in async local storage
let currentOperator: string | null = null;
let currentUserId: string | null = null;
let currentIp: string | null = null;

/**
 * Set current operator context (call this in your API routes/actions)
 */
export function setLogContext(operator: string, userId?: string, request?: Request, ip?: string) {
  currentOperator = operator;
  currentUserId = userId || null;
  currentIp = ip || (request ? getClientIp(request) : null);
}

/**
 * Clear log context
 */
export function clearLogContext() {
  currentOperator = null;
  currentUserId = null;
  currentIp = null;
}

/**
 * Prisma middleware for automatic operation logging
 *
 * NOTE: Currently disabled in prisma.ts
 * Manual logging is used in service functions instead
 */
export const logMiddleware: Prisma.Middleware = async (params, next) => {
  const result = await next(params);

  // Only log Archive operations
  if (params.model === "Archive") {
    const operation = params.action;

    // Log create, update, delete operations
    if (["create", "update", "delete"].includes(operation)) {
      const archive = result as any;

      if (!archive || !archive.archiveID) {
        return result;
      }

      // Get operator from context
      const operator = currentOperator || "system";
      const userId = currentUserId;
      const ip = currentIp || "unknown";

      // Map Prisma action to operation type
      const operationType = operation === "create" ? "create" :
                           operation === "update" ? "modify" :
                           operation === "delete" ? "delete" : operation;

      // Build target description
      const target = `${archive.archiveNo}-${archive.title || "未命名"}`;

      // Create log entry (fire and forget)
      createLog({
        operator,
        operation: operationType,
        target,
        ip,
        archiveId: archive.archiveID,
        userId,
      }).catch((error) => {
        console.error("[Prisma Middleware] Failed to create log:", error);
      });
    }
  }

  return result;
};

/**
 * Helper function to get current operator
 */
export function getCurrentOperator(): string | null {
  return currentOperator;
}

/**
 * Helper function to get current user ID
 */
export function getCurrentUserId(): string | null {
  return currentUserId;
}
