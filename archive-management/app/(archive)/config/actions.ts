"use server";

import { auth } from "@/auth";
import {
  queryConfigs,
  createConfig,
  updateConfig,
  deleteConfig,
  exportConfigs,
  importConfigs,
  getHistory,
  getGroups,
} from "@/services/config.service";
import {
  validateConfigValue,
  getValidationErrorMessage,
  isValidConfigType,
  type ConfigType,
} from "@/lib/config-validator";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

/**
 * Response wrapper for server actions
 */
interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Query configurations with pagination and filtering
 *
 * @param params - Query parameters including page, pageSize, group, and search
 * @returns Paginated list of configurations
 *
 * @example
 * ```ts
 * const result = await queryConfigsAction({
 *   page: 1,
 *   pageSize: 20,
 *   group: 'log',
 *   search: 'retention'
 * });
 * ```
 */
export async function queryConfigsAction(params: {
  page: number;
  pageSize: number;
  group?: string;
  search?: string;
}): Promise<ActionResult> {
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
    if (session.user.role !== "admin" && session.user.role !== "管理员") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Validate parameters
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 20));

    // Query configs
    const result = await queryConfigs({
      page,
      pageSize,
      group: params.group,
      search: params.search,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[Config Actions] Failed to query configs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "查询配置失败",
    };
  }
}

/**
 * Create a new configuration
 *
 * @param data - Configuration data including configKey, configValue, configType, description, group
 * @returns Created configuration
 *
 * @example
 * ```ts
 * const result = await createConfigAction({
 *   configKey: 'custom.setting',
 *   configValue: 'value',
 *   configType: 'string',
 *   description: 'Custom setting',
 *   group: 'custom'
 * });
 * ```
 */
export async function createConfigAction(data: {
  configKey: string;
  configValue: string;
  configType: string;
  description?: string;
  group?: string;
}): Promise<ActionResult> {
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
    if (session.user.role !== "admin" && session.user.role !== "管理员") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Validate input
    const configKeySchema = z
      .string()
      .min(1, "配置键不能为空")
      .max(100, "配置键不能超过100个字符")
      .regex(/^[a-zA-Z0-9._-]+$/, "配置键只能包含字母、数字、点、下划线和连字符");

    const configKeyResult = configKeySchema.safeParse(data.configKey);
    if (!configKeyResult.success) {
      return {
        success: false,
        error: configKeyResult.error.errors[0].message,
      };
    }

    // Validate config type
    if (!isValidConfigType(data.configType)) {
      return {
        success: false,
        error: "无效的配置类型",
      };
    }

    // Validate config value based on type
    try {
      validateConfigValue(data.configValue, data.configType as ConfigType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: getValidationErrorMessage(error),
        };
      }
      return {
        success: false,
        error: "配置值格式错误",
      };
    }

    // Validate group
    if (data.group && data.group.length > 50) {
      return {
        success: false,
        error: "分组名称不能超过50个字符",
      };
    }

    // Validate description
    if (data.description && data.description.length > 500) {
      return {
        success: false,
        error: "描述不能超过500个字符",
      };
    }

    // Create config
    const config = await createConfig(
      {
        configKey: data.configKey,
        configValue: data.configValue,
        configType: data.configType,
        description: data.description,
        group: data.group || "default",
        isSystem: false,
      },
      session.user.username || "unknown"
    );

    return {
      success: true,
      data: config,
    };
  } catch (error) {
    console.error("[Config Actions] Failed to create config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "创建配置失败",
    };
  }
}

/**
 * Update an existing configuration
 *
 * @param data - Update data including configKey, configValue, configType, description, group
 * @returns Updated configuration
 *
 * @example
 * ```ts
 * const result = await updateConfigAction({
 *   configKey: 'log.retention.days',
 *   configValue: '180',
 *   configType: 'number'
 * });
 * ```
 */
export async function updateConfigAction(data: {
  configKey: string;
  configValue: string;
  configType?: string;
}): Promise<ActionResult> {
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
    if (session.user.role !== "admin" && session.user.role !== "管理员") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Get existing config to validate type
    const existingConfig = await prisma.systemConfig.findUnique({
      where: { configKey: data.configKey },
    });

    if (!existingConfig) {
      return {
        success: false,
        error: "配置不存在",
      };
    }

    const configType = data.configType || existingConfig.configType;

    // Validate config value based on type
    try {
      validateConfigValue(data.configValue, configType as ConfigType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: getValidationErrorMessage(error),
        };
      }
      return {
        success: false,
        error: "配置值格式错误",
      };
    }

    // Update config
    const config = await updateConfig(
      data.configKey,
      data.configValue,
      session.user.username || "unknown"
    );

    return {
      success: true,
      data: config,
    };
  } catch (error) {
    console.error("[Config Actions] Failed to update config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "更新配置失败",
    };
  }
}

/**
 * Delete a configuration
 *
 * @param configKey - Configuration key to delete
 * @returns Success status
 *
 * @example
 * ```ts
 * const result = await deleteConfigAction('custom.config');
 * ```
 */
export async function deleteConfigAction(configKey: string): Promise<ActionResult> {
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
    if (session.user.role !== "admin" && session.user.role !== "管理员") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Get config before deletion for logging
    const config = await prisma.systemConfig.findUnique({
      where: { configKey },
    });

    if (!config) {
      return {
        success: false,
        error: "配置不存在",
      };
    }

    // Check if it's a system config
    if (config.isSystem) {
      return {
        success: false,
        error: "系统保留配置不可删除",
      };
    }

    // Delete config
    await deleteConfig(configKey);

    return {
      success: true,
    };
  } catch (error) {
    console.error("[Config Actions] Failed to delete config:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除配置失败",
    };
  }
}

/**
 * Export all configurations as JSON
 *
 * @returns All configurations in exportable format
 *
 * @example
 * ```ts
 * const result = await exportConfigsAction();
 * console.log(result.data); // Array of configs
 * ```
 */
export async function exportConfigsAction(): Promise<ActionResult> {
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
    if (session.user.role !== "admin" && session.user.role !== "管理员") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Export configs
    const configs = await exportConfigs();

    return {
      success: true,
      data: configs,
    };
  } catch (error) {
    console.error("[Config Actions] Failed to export configs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "导出配置失败",
    };
  }
}

/**
 * Import configurations from JSON array
 *
 * @param configs - Array of configurations to import
 * @returns Import result with success/skipped/failed counts
 *
 * @example
 * ```ts
 * const result = await importConfigsAction([
 *   { configKey: 'new.config', configValue: 'value', configType: 'string', ... }
 * ]);
 * ```
 */
export async function importConfigsAction(configs: Array<{
  configKey: string;
  configValue: string;
  configType: string;
  description?: string;
  group: string;
}>): Promise<ActionResult> {
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
    if (session.user.role !== "admin" && session.user.role !== "管理员") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Validate input array
    if (!Array.isArray(configs)) {
      return {
        success: false,
        error: "导入数据格式错误",
      };
    }

    if (configs.length === 0) {
      return {
        success: false,
        error: "导入数据为空",
      };
    }

    if (configs.length > 1000) {
      return {
        success: false,
        error: "单次最多导入1000条配置",
      };
    }

    // Import configs
    const result = await importConfigs(
      configs,
      session.user.username || "unknown"
    );

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("[Config Actions] Failed to import configs:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "导入配置失败",
    };
  }
}

/**
 * Get configuration change history
 *
 * @param configKey - Configuration key to get history for
 * @returns Array of history records
 *
 * @example
 * ```ts
 * const result = await getConfigHistoryAction('log.retention.days');
 * console.log(result.data); // Array of history records
 * ```
 */
export async function getConfigHistoryAction(configKey: string): Promise<ActionResult> {
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
    if (session.user.role !== "admin" && session.user.role !== "管理员") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Validate config key
    if (!configKey || configKey.length > 100) {
      return {
        success: false,
        error: "配置键无效",
      };
    }

    // Get history
    const history = await getHistory(configKey);

    return {
      success: true,
      data: history,
    };
  } catch (error) {
    console.error("[Config Actions] Failed to get config history:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取配置历史失败",
    };
  }
}

/**
 * Get all configuration groups
 *
 * @returns Array of unique group names
 *
 * @example
 * ```ts
 * const result = await getConfigGroupsAction();
 * console.log(result.data); // ['log', 'license', 'system']
 * ```
 */
export async function getConfigGroupsAction(): Promise<ActionResult> {
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
    if (session.user.role !== "admin" && session.user.role !== "管理员") {
      return {
        success: false,
        error: "无权访问",
      };
    }

    // Get groups
    const groups = await getGroups();

    return {
      success: true,
      data: groups,
    };
  } catch (error) {
    console.error("[Config Actions] Failed to get config groups:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取配置分组失败",
    };
  }
}
