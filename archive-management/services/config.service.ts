import { prisma } from "@/lib/prisma";
import { configCache } from "@/lib/config-cache";

/**
 * Configuration Service
 *
 * Provides CRUD operations for system configuration with type conversion,
 * caching integration, and history tracking.
 *
 * Features:
 * - Type-safe config value retrieval (string, number, boolean, JSON)
 * - Automatic cache integration for performance
 * - Config history tracking for all updates
 * - Bulk operations for export/import
 * - Group-based filtering
 * - Pagination support
 */

/**
 * Query parameters for listing configurations
 */
export interface ConfigQueryParams {
  /** Current page number (1-based) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Optional group filter */
  group?: string;
  /** Optional search term for config key or description */
  search?: string;
}

/**
 * Response from config query operation
 */
export interface ConfigListResponse {
  /** Array of configuration items */
  items: Array<{
    id: string;
    configKey: string;
    configValue: string;
    configType: string;
    description: string | null;
    group: string;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  /** Total number of items matching the query */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Current page number */
  currentPage: number;
}

/**
 * Input data for creating a new configuration
 */
export interface CreateConfigInput {
  /** Unique configuration key */
  configKey: string;
  /** Configuration value */
  configValue: string;
  /** Configuration type (string/number/boolean/json) */
  configType: string;
  /** Optional description */
  description?: string;
  /** Configuration group (default: "default") */
  group?: string;
  /** Whether this is a system config (default: false) */
  isSystem?: boolean;
}

/**
 * Configuration data for export/import
 */
export interface ExportedConfig {
  configKey: string;
  configValue: string;
  configType: string;
  description: string | null;
  group: string;
}

/**
 * Result of configuration import operation
 */
export interface ImportResult {
  /** Number of successfully imported configs */
  success: number;
  /** Number of skipped configs (already exist) */
  skipped: number;
  /** Number of failed imports */
  failed: number;
}

/**
 * Get a configuration value as string
 *
 * @param key - Configuration key to retrieve
 * @returns Configuration value or null if not found
 *
 * @example
 * ```ts
 * const value = await configService.get('system.name');
 * console.log(value); // "档案管理系统"
 * ```
 */
export async function get(key: string): Promise<string | null> {
  // Try to get from cache first
  const cachedValue = await configCache.get(key);
  if (cachedValue !== null) {
    return cachedValue;
  }

  // Cache miss - load from database
  const config = await prisma.systemConfig.findUnique({
    where: { configKey: key },
    select: { configValue: true },
  });

  if (config) {
    // Update cache
    await configCache.set(key, config.configValue);
    return config.configValue;
  }

  return null;
}

/**
 * Get a configuration value as number
 *
 * @param key - Configuration key to retrieve
 * @returns Parsed number value or null if not found/invalid
 *
 * @example
 * ```ts
 * const days = await configService.getNumber('log.retention.days');
 * console.log(days); // 365
 * ```
 */
export async function getNumber(key: string): Promise<number | null> {
  const value = await get(key);

  if (value === null) {
    return null;
  }

  const parsed = Number(value);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Get a configuration value as boolean
 *
 * @param key - Configuration key to retrieve
 * @returns Parsed boolean value or null if not found
 *
 * @example
 * ```ts
 * const enabled = await configService.getBoolean('license.cache.enabled');
 * console.log(enabled); // true
 * ```
 */
export async function getBoolean(key: string): Promise<boolean | null> {
  const value = await get(key);

  if (value === null) {
    return null;
  }

  return value === "true";
}

/**
 * Get a configuration value as parsed JSON
 *
 * @param key - Configuration key to retrieve
 * @returns Parsed JSON object or null if not found/invalid
 *
 * @example
 * ```ts
 * const metadata = await configService.getJSON('archive.metadata.schema');
 * console.log(metadata); // { fields: [...] }
 * ```
 */
export async function getJSON<T = any>(key: string): Promise<T | null> {
  const value = await get(key);

  if (value === null) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Set a configuration value
 *
 * Creates a history record and updates cache.
 *
 * @param key - Configuration key to set
 * @param value - New configuration value
 * @param operator - Username of the operator
 *
 * @example
 * ```ts
 * await configService.set('log.retention.days', '180', 'admin');
 * ```
 */
export async function set(
  key: string,
  value: string,
  operator: string
): Promise<void> {
  // Get existing config to check if we're creating or updating
  const existing = await prisma.systemConfig.findUnique({
    where: { configKey: key },
  });

  if (existing) {
    // Update existing config
    const oldValue = existing.configValue;

    // Update config value
    await prisma.systemConfig.update({
      where: { configKey: key },
      data: { configValue: value },
    });

    // Create history record
    await prisma.configHistory.create({
      data: {
        configKey: key,
        oldValue,
        newValue: value,
        operator,
        configId: existing.id,
      },
    });

    // Update cache
    await configCache.set(key, value);
  } else {
    // Create new config with default values
    const newConfig = await prisma.systemConfig.create({
      data: {
        configKey: key,
        configValue: value,
        configType: "string",
        group: "default",
        isSystem: false,
      },
    });

    // Create history record
    await prisma.configHistory.create({
      data: {
        configKey: key,
        oldValue: "",
        newValue: value,
        operator,
        configId: newConfig.id,
      },
    });

    // Update cache
    await configCache.set(key, value);
  }
}

/**
 * Delete a configuration
 *
 * Removes the configuration and invalidates cache.
 * System configurations (isSystem: true) cannot be deleted.
 *
 * @param key - Configuration key to delete
 * @throws Error if trying to delete a system config
 *
 * @example
 * ```ts
 * await configService.deleteConfig('custom.config');
 * ```
 */
export async function deleteConfig(key: string): Promise<void> {
  // Check if config exists and if it's a system config
  const config = await prisma.systemConfig.findUnique({
    where: { configKey: key },
  });

  if (!config) {
    return; // Nothing to delete
  }

  if (config.isSystem) {
    throw new Error("系统保留配置不可删除");
  }

  // Delete the config (history records will be cascade deleted)
  await prisma.systemConfig.delete({
    where: { configKey: key },
  });

  // Remove from cache
  await configCache.delete(key);
}

/**
 * Get all configurations in a specific group
 *
 * @param group - Group name to filter by
 * @returns Array of configurations in the group
 *
 * @example
 * ```ts
 * const logConfigs = await configService.getByGroup('log');
 * console.log(logConfigs); // [{ configKey: 'log.retention.days', ... }]
 * ```
 */
export async function getByGroup(group: string): Promise<
  Array<{
    id: string;
    configKey: string;
    configValue: string;
    configType: string;
    description: string | null;
    group: string;
    isSystem: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>
> {
  const configs = await prisma.systemConfig.findMany({
    where: { group },
    orderBy: { configKey: "asc" },
  });

  return configs;
}

/**
 * Query configurations with pagination and filtering
 *
 * @param params - Query parameters (page, pageSize, group, search)
 * @returns Paginated list of configurations
 *
 * @example
 * ```ts
 * const result = await configService.queryConfigs({
 *   page: 1,
 *   pageSize: 20,
 *   group: 'log',
 *   search: 'retention'
 * });
 * console.log(result.items); // Array of configs
 * console.log(result.total); // Total count
 * ```
 */
export async function queryConfigs(
  params: ConfigQueryParams
): Promise<ConfigListResponse> {
  const { page, pageSize, group, search } = params;

  // Build where clause
  const where: {
    group?: string;
    OR?: Array<{
      configKey: { contains: string; mode: "insensitive" };
    } | {
      description: { contains: string; mode: "insensitive" };
    }>;
  } = {};

  if (group) {
    where.group = group;
  }

  if (search) {
    where.OR = [
      { configKey: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  // Get total count
  const total = await prisma.systemConfig.count({ where });

  // Calculate pagination
  const skip = (page - 1) * pageSize;
  const totalPages = Math.ceil(total / pageSize);

  // Get items
  const items = await prisma.systemConfig.findMany({
    where,
    skip,
    take: pageSize,
    orderBy: [{ group: "asc" }, { configKey: "asc" }],
  });

  return {
    items,
    total,
    totalPages,
    currentPage: page,
  };
}

/**
 * Create a new configuration
 *
 * @param data - Configuration data
 * @param operator - Username of the operator
 * @returns Created configuration
 * @throws Error if config key already exists
 *
 * @example
 * ```ts
 * const config = await configService.createConfig({
 *   configKey: 'custom.setting',
 *   configValue: 'value',
 *   configType: 'string',
 *   description: 'Custom setting',
 *   group: 'custom'
 * }, 'admin');
 * ```
 */
export async function createConfig(
  data: CreateConfigInput,
  operator: string
): Promise<{
  id: string;
  configKey: string;
  configValue: string;
  configType: string;
  description: string | null;
  group: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}> {
  // Check if config key already exists
  const existing = await prisma.systemConfig.findUnique({
    where: { configKey: data.configKey },
  });

  if (existing) {
    throw new Error("配置键已存在");
  }

  // Create new config
  const config = await prisma.systemConfig.create({
    data: {
      configKey: data.configKey,
      configValue: data.configValue,
      configType: data.configType,
      description: data.description,
      group: data.group || "default",
      isSystem: data.isSystem || false,
    },
  });

  // Create history record
  await prisma.configHistory.create({
    data: {
      configKey: config.configKey,
      oldValue: "",
      newValue: config.configValue,
      operator,
      configId: config.id,
    },
  });

  // Update cache
  await configCache.set(config.configKey, config.configValue);

  return config;
}

/**
 * Update an existing configuration
 *
 * Creates a history record and updates cache.
 *
 * @param key - Configuration key to update
 * @param value - New configuration value
 * @param operator - Username of the operator
 * @returns Updated configuration
 * @throws Error if config not found
 *
 * @example
 * ```ts
 * const config = await configService.updateConfig(
 *   'log.retention.days',
 *   '180',
 *   'admin'
 * );
 * ```
 */
export async function updateConfig(
  key: string,
  value: string,
  operator: string
): Promise<{
  id: string;
  configKey: string;
  configValue: string;
  configType: string;
  description: string | null;
  group: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}> {
  // Get existing config
  const existing = await prisma.systemConfig.findUnique({
    where: { configKey: key },
  });

  if (!existing) {
    throw new Error("配置不存在");
  }

  const oldValue = existing.configValue;

  // Update config
  const config = await prisma.systemConfig.update({
    where: { configKey: key },
    data: { configValue: value },
  });

  // Create history record
  await prisma.configHistory.create({
    data: {
      configKey: key,
      oldValue,
      newValue: value,
      operator,
      configId: existing.id,
    },
  });

  // Update cache
  await configCache.set(key, value);

  return config;
}

/**
 * Export all configurations
 *
 * Returns all configurations in a format suitable for import.
 *
 * @returns Array of all configurations
 *
 * @example
 * ```ts
 * const configs = await configService.exportConfigs();
 * console.log(configs); // [{ configKey: '...', configValue: '...', ... }]
 * ```
 */
export async function exportConfigs(): Promise<ExportedConfig[]> {
  const configs = await prisma.systemConfig.findMany({
    orderBy: [{ group: "asc" }, { configKey: "asc" }],
  });

  return configs.map((config) => ({
    configKey: config.configKey,
    configValue: config.configValue,
    configType: config.configType,
    description: config.description,
    group: config.group,
  }));
}

/**
 * Import configurations
 *
 * Creates configurations that don't already exist.
 * Skips configurations with existing keys.
 *
 * @param configs - Array of configurations to import
 * @param operator - Username of the operator
 * @returns Import result with success/skipped/failed counts
 *
 * @example
 * ```ts
 * const result = await configService.importConfigs(
 *   [{ configKey: 'new.config', configValue: 'value', ... }],
 *   'admin'
 * );
 * console.log(result); // { success: 1, skipped: 0, failed: 0 }
 * ```
 */
export async function importConfigs(
  configs: ExportedConfig[],
  operator: string
): Promise<ImportResult> {
  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const config of configs) {
    try {
      // Check if config key already exists
      const existing = await prisma.systemConfig.findUnique({
        where: { configKey: config.configKey },
      });

      if (existing) {
        // Skip existing config
        skipped++;
      } else {
        // Create new config
        const newConfig = await prisma.systemConfig.create({
          data: {
            configKey: config.configKey,
            configValue: config.configValue,
            configType: config.configType,
            description: config.description,
            group: config.group,
            isSystem: false, // Imported configs are never system configs
          },
        });

        // Create history record
        await prisma.configHistory.create({
          data: {
            configKey: config.configKey,
            oldValue: "",
            newValue: config.configValue,
            operator,
            configId: newConfig.id,
          },
        });

        // Update cache
        await configCache.set(config.configKey, config.configValue);

        success++;
      }
    } catch (error) {
      // Log error but continue processing
      console.error(
        `Failed to import config ${config.configKey}:`,
        error
      );
      failed++;
    }
  }

  return { success, skipped, failed };
}

/**
 * Get configuration by key (full record)
 *
 * Returns the complete configuration record including metadata.
 *
 * @param key - Configuration key to retrieve
 * @returns Full configuration record or null if not found
 *
 * @example
 * ```ts
 * const config = await configService.getByKey('log.retention.days');
 * console.log(config); // { id: '...', configKey: '...', ... }
 * ```
 */
export async function getByKey(key: string): Promise<{
  id: string;
  configKey: string;
  configValue: string;
  configType: string;
  description: string | null;
  group: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
} | null> {
  const config = await prisma.systemConfig.findUnique({
    where: { configKey: key },
  });

  return config;
}

/**
 * Get configuration history
 *
 * Returns all history records for a specific configuration.
 *
 * @param key - Configuration key to get history for
 * @returns Array of history records
 *
 * @example
 * ```ts
 * const history = await configService.getHistory('log.retention.days');
 * console.log(history); // [{ oldValue: '365', newValue: '180', ... }]
 * ```
 */
export async function getHistory(key: string): Promise<
  Array<{
    id: string;
    configKey: string;
    oldValue: string;
    newValue: string;
    operator: string;
    createdAt: Date;
  }>
> {
  const history = await prisma.configHistory.findMany({
    where: { configKey: key },
    orderBy: { createdAt: "desc" },
  });

  return history;
}

/**
 * Get all unique configuration groups
 *
 * Returns a list of all group names that have at least one configuration.
 *
 * @returns Array of unique group names
 *
 * @example
 * ```ts
 * const groups = await configService.getGroups();
 * console.log(groups); // ['log', 'license', 'system']
 * ```
 */
export async function getGroups(): Promise<string[]> {
  const groups = await prisma.systemConfig.findMany({
    select: { group: true },
    distinct: ["group"],
    orderBy: { group: "asc" },
  });

  return groups.map((g) => g.group);
}

/**
 * Bulk set configurations (transactional)
 *
 * Sets multiple configurations in a single transaction.
 * All configurations are updated or created, and history is tracked.
 *
 * @param configs - Array of { key, value } pairs to set
 * @param operator - Username of the operator
 *
 * @example
 * ```ts
 * await configService.bulkSet([
 *   { key: 'log.retention.days', value: '365' },
 *   { key: 'license.cache.enabled', value: 'true' }
 * ], 'admin');
 * ```
 */
export async function bulkSet(
  configs: Array<{ key: string; value: string }>,
  operator: string
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const { key, value } of configs) {
      const existing = await tx.systemConfig.findUnique({
        where: { configKey: key },
      });

      if (existing) {
        const oldValue = existing.configValue;

        // Update config
        await tx.systemConfig.update({
          where: { configKey: key },
          data: { configValue: value },
        });

        // Create history record
        await tx.configHistory.create({
          data: {
            configKey: key,
            oldValue,
            newValue: value,
            operator,
            configId: existing.id,
          },
        });

        // Update cache
        await configCache.set(key, value);
      } else {
        // Create new config
        const newConfig = await tx.systemConfig.create({
          data: {
            configKey: key,
            configValue: value,
            configType: "string",
            group: "default",
            isSystem: false,
          },
        });

        // Create history record
        await tx.configHistory.create({
          data: {
            configKey: key,
            oldValue: "",
            newValue: value,
            operator,
            configId: newConfig.id,
          },
        });

        // Update cache
        await configCache.set(key, value);
      }
    }
  });
}
