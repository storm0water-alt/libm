/**
 * Configuration Utility Functions
 *
 * Provides convenient getter functions for accessing system configuration values.
 * These functions handle database queries, caching, and type conversion automatically.
 *
 * Features:
 * - Type-safe getters for common config values
 * - Automatic caching for performance
 * - Default value fallbacks
 * - Support for dynamic config access
 */

import { prisma } from "@/lib/prisma";
import { configCache } from "@/lib/config-cache";
import { validateConfigValue, ConfigType } from "@/lib/config-validator";

/**
 * Get a configuration value by key with optional default and type conversion
 *
 * This is the core function that all other config getters are built upon.
 * It performs the following steps:
 * 1. Check cache for existing value
 * 2. If not cached, query database
 * 3. Validate and convert value type
 * 4. Cache the result for future access
 *
 * @param key - Configuration key (e.g., "log.retention.days")
 * @param defaultValue - Default value to return if config not found
 * @param type - Expected type for validation (defaults to "string")
 * @returns The configuration value or default
 *
 * @example
 * ```ts
 * // Get a string value
 * const systemName = await getConfig("system.name", "默认系统");
 *
 * // Get a number value with type conversion
 * const retentionDays = await getConfig("log.retention.days", 30, "number");
 *
 * // Get a boolean value
 * const cacheEnabled = await getConfig("license.cache.enabled", false, "boolean");
 * ```
 */
export async function getConfig<T = string>(
  key: string,
  defaultValue?: T,
  type: ConfigType = "string"
): Promise<T> {
  // Try to get from cache first
  const cachedValue = await configCache.get(key);
  if (cachedValue !== null) {
    try {
      const validated = validateConfigValue(cachedValue, type);
      return validated as T;
    } catch {
      // If cached value is invalid, fall through to DB query
    }
  }

  // Query database
  const config = await prisma.systemConfig.findUnique({
    where: { configKey: key },
  });

  if (!config) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw new Error(`Configuration key "${key}" not found and no default provided`);
  }

  // Cache the value
  await configCache.set(key, config.configValue);

  // Validate and return
  try {
    const validated = validateConfigValue(config.configValue, type);
    return validated as T;
  } catch (error) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    throw error;
  }
}

/**
 * Get multiple configuration values by keys
 *
 * Efficiently retrieves multiple config values in a single database query.
 * Returns a map of config keys to their values.
 *
 * @param keys - Array of configuration keys to retrieve
 * @param typeMap - Optional map of keys to their expected types
 * @returns Record mapping config keys to their values
 *
 * @example
 * ```ts
 * const configs = await getConfigs(["system.name", "log.retention.days"], {
 *   "log.retention.days": "number"
 * });
 * console.log(configs["system.name"]); // string
 * console.log(configs["log.retention.days"]); // number
 * ```
 */
export async function getConfigs(
  keys: string[],
  typeMap?: Record<string, ConfigType>
): Promise<Record<string, any>> {
  const configs = await prisma.systemConfig.findMany({
    where: {
      configKey: { in: keys },
    },
  });

  const result: Record<string, any> = {};

  for (const key of keys) {
    const config = configs.find((c) => c.configKey === key);
    if (config) {
      const type = typeMap?.[key] || "string";
      try {
        result[key] = validateConfigValue(config.configValue, type);
        await configCache.set(key, config.configValue);
      } catch {
        result[key] = config.configValue;
      }
    }
  }

  return result;
}

/**
 * Set a configuration value by key
 *
 * Updates or creates a configuration value in the database and invalidates cache.
 *
 * @param key - Configuration key
 * @param value - New configuration value
 * @param type - Type of the configuration value
 * @param operator - Username of the operator for history tracking
 *
 * @example
 * ```ts
 * await setConfig("log.retention.days", "180", "number", "admin");
 * ```
 */
export async function setConfig(
  key: string,
  value: string,
  type: ConfigType = "string",
  operator?: string
): Promise<void> {
  // Get old value for history
  const oldConfig = await prisma.systemConfig.findUnique({
    where: { configKey: key },
  });

  // Update or create config
  await prisma.systemConfig.upsert({
    where: { configKey: key },
    update: {
      configValue: value,
      configType: type,
    },
    create: {
      configKey: key,
      configValue: value,
      configType: type,
    },
  });

  // Create history record if operator provided
  if (operator && oldConfig) {
    await prisma.configHistory.create({
      data: {
        configKey: key,
        oldValue: oldConfig.configValue,
        newValue: value,
        operator,
      },
    });
  }

  // Invalidate cache
  await configCache.delete(key);
}

/**
 * Convenience getters for common system configurations
 */

/**
 * Get log retention days
 * @returns Number of days to retain logs (default: 365)
 */
export async function getLogRetentionDays(): Promise<number> {
  return getConfig("log.retention.days", 365, "number");
}

/**
 * Check if license caching is enabled
 * @returns True if caching is enabled (default: true)
 */
export async function isLicenseCacheEnabled(): Promise<boolean> {
  return getConfig("license.cache.enabled", true, "boolean");
}

/**
 * Get system name
 * @returns System name (default: "档案管理系统")
 */
export async function getSystemName(): Promise<string> {
  return getConfig("system.name", "档案管理系统", "string");
}

/**
 * Get maximum upload file size in bytes
 * @returns Max file size in bytes (default: 52428800 = 50MB)
 */
export async function getMaxUploadSize(): Promise<number> {
  return getConfig("upload.max.size", 52428800, "number");
}

/**
 * Get default pagination size
 * @returns Default page size (default: 20)
 */
export async function getDefaultPaginationSize(): Promise<number> {
  return getConfig("pagination.default.size", 20, "number");
}

/**
 * Get all configurations by group
 *
 * Retrieves all configurations belonging to a specific group.
 * Useful for loading all configs for a settings page.
 *
 * @param group - Configuration group name
 * @returns Array of configurations
 *
 * @example
 * ```ts
 * const systemConfigs = await getConfigsByGroup("system");
 * console.log(systemConfigs);
 * // [
 * //   { configKey: "system.name", configValue: "档案管理系统", ... },
 * //   { configKey: "log.retention.days", configValue: "365", ... }
 * // ]
 * ```
 */
export async function getConfigsByGroup(group: string): Promise<
  Array<{
    configKey: string;
    configValue: string;
    configType: string;
    description: string | null;
    isSystem: boolean;
  }>
> {
  const configs = await prisma.systemConfig.findMany({
    where: { group },
    select: {
      configKey: true,
      configValue: true,
      configType: true,
      description: true,
      isSystem: true,
    },
  });

  // Cache all configs
  for (const config of configs) {
    await configCache.set(config.configKey, config.configValue);
  }

  return configs;
}

/**
 * Invalidate all cached configuration values
 *
 * Call this after bulk configuration updates to ensure consistency.
 *
 * @example
 * ```ts
 * await invalidateConfigCache();
 * console.log("Config cache invalidated");
 * ```
 */
export async function invalidateConfigCache(): Promise<void> {
  await configCache.invalidate();
}

/**
 * Get configuration cache statistics
 *
 * Returns metrics about the current state of the configuration cache.
 *
 * @returns Cache statistics object
 *
 * @example
 * ```ts
 * const stats = await getConfigCacheStats();
 * console.log(`Cached items: ${stats.size}`);
 * console.log(`Last update: ${new Date(stats.lastUpdate).toISOString()}`);
 * ```
 */
export async function getConfigCacheStats(): Promise<{
  size: number;
  lastUpdate: number;
}> {
  return configCache.getStats();
}
