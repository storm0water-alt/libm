/**
 * Configuration Cache Manager
 *
 * Provides in-memory caching for system configuration with TTL support.
 * This cache layer improves configuration read performance by avoiding
 * repeated database queries for frequently accessed config values.
 *
 * Features:
 * - In-memory storage using Map
 * - TTL (Time To Live) support for automatic expiry
 * - Bulk loading for cache warming
 * - Cache invalidation for data consistency
 */

/**
 * Cached value with expiry timestamp
 */
interface CachedValue {
  /** The cached configuration value */
  value: string;
  /** Expiry timestamp in milliseconds (Infinity for no expiry) */
  expiry: number;
}

/**
 * Configuration cache manager class
 *
 * Manages in-memory caching of configuration values with automatic expiry.
 * All methods are async for consistency with service layer patterns.
 */
class ConfigCache {
  /** Internal cache storage using Map for O(1) lookups */
  private cache: Map<string, CachedValue> = new Map();

  /** Last cache update timestamp in milliseconds */
  private lastUpdate: number = 0;

  /** Default TTL in seconds (60 seconds) */
  private readonly DEFAULT_TTL = 60;

  /**
   * Get a cached configuration value by key
   *
   * @param key - Configuration key to retrieve
   * @returns The cached value or null if not found or expired
   *
   * @example
   * ```ts
   * const value = await configCache.get('log.retention.days');
   * if (value !== null) {
   *   console.log(`Cached value: ${value}`);
   * }
   * ```
   */
  async get(key: string): Promise<string | null> {
    const cached = this.cache.get(key);

    // Return null if key not found
    if (!cached) {
      return null;
    }

    // Check if cached value has expired
    const now = Date.now();
    if (now > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Set a configuration value in cache with optional TTL
   *
   * @param key - Configuration key to cache
   * @param value - Configuration value to store
   * @param ttl - Time to live in seconds (default: 60). Use Infinity for no expiry.
   *
   * @example
   * ```ts
   * // Cache with default TTL (60 seconds)
   * await configCache.set('log.retention.days', '365');
   *
   * // Cache with custom TTL (5 minutes)
   * await configCache.set('api.key', 'secret', 300);
   *
   * // Cache without expiry
   * await configCache.set('system.name', 'Archive System', Infinity);
   * ```
   */
  async set(key: string, value: string, ttl: number = this.DEFAULT_TTL): Promise<void> {
    const expiry = ttl === Infinity ? Infinity : Date.now() + ttl * 1000;

    this.cache.set(key, {
      value,
      expiry,
    });
  }

  /**
   * Invalidate all cached configuration values
   *
   * Clears the entire cache and resets the last update timestamp.
   * Use this after bulk configuration updates to ensure consistency.
   *
   * @example
   * ```ts
   * await configCache.invalidate();
   * console.log('Cache cleared');
   * ```
   */
  async invalidate(): Promise<void> {
    this.cache.clear();
    this.lastUpdate = Date.now();
  }

  /**
   * Bulk load configuration values into cache
   *
   * Clears existing cache and loads all provided configurations.
   * Useful for cache warming during system startup or after bulk updates.
   * Loaded configurations have no expiry (Infinity TTL).
   *
   * @param configs - Array of configuration objects with configKey and configValue
   *
   * @example
   * ```ts
   * const configs = await prisma.systemConfig.findMany();
   * await configCache.bulkLoad(configs);
   * console.log(`Loaded ${configs.length} configurations into cache`);
   * ```
   */
  async bulkLoad(configs: Array<{ configKey: string; configValue: string }>): Promise<void> {
    this.cache.clear();

    configs.forEach((config) => {
      this.cache.set(config.configKey, {
        value: config.configValue,
        expiry: Infinity, // No expiry for bulk loaded configs
      });
    });

    this.lastUpdate = Date.now();
  }

  /**
   * Get the number of cached items
   *
   * @returns The count of items currently in cache
   *
   * @example
   * ```ts
   * const size = await configCache.size();
   * console.log(`Cache size: ${size} items`);
   * ```
   */
  async size(): Promise<number> {
    // Clean expired entries before returning size
    await this.cleanExpired();
    return this.cache.size;
  }

  /**
   * Get the last cache update timestamp
   *
   * @returns Timestamp in milliseconds of the last cache update
   *
   * @example
   * ```ts
   * const lastUpdate = await configCache.getLastUpdate();
   * console.log(`Cache last updated: ${new Date(lastUpdate).toISOString()}`);
   * ```
   */
  async getLastUpdate(): Promise<number> {
    return this.lastUpdate;
  }

  /**
   * Clean expired entries from cache
   *
   * Removes all cached values that have exceeded their TTL.
   * This is called automatically before size() operations.
   *
   * @private
   */
  private async cleanExpired(): Promise<void> {
    const now = Date.now();
    const keysToDelete: string[] = [];

    Array.from(this.cache.entries()).forEach(([key, cached]) => {
      if (now > cached.expiry) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  /**
   * Check if a specific key exists in cache and is not expired
   *
   * @param key - Configuration key to check
   * @returns True if key exists and is valid, false otherwise
   *
   * @example
   * ```ts
   * const exists = await configCache.has('log.retention.days');
   * if (exists) {
   *   console.log('Key is cached and valid');
   * }
   * ```
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }

  /**
   * Delete a specific key from cache
   *
   * @param key - Configuration key to delete
   * @returns True if key was deleted, false if it didn't exist
   *
   * @example
   * ```ts
   * const deleted = await configCache.delete('api.key');
   * if (deleted) {
   *   console.log('Key removed from cache');
   * }
   * ```
   */
  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  /**
   * Get all cached keys (excluding expired entries)
   *
   * @returns Array of all valid cached keys
   *
   * @example
   * ```ts
   * const keys = await configCache.keys();
   * console.log('Cached keys:', keys);
   * ```
   */
  async keys(): Promise<string[]> {
    await this.cleanExpired();
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics for monitoring
   *
   * @returns Object containing cache metrics
   *
   * @example
   * ```ts
   * const stats = await configCache.getStats();
   * console.log('Cache stats:', stats);
   * // { size: 10, lastUpdate: 1234567890 }
   * ```
   */
  async getStats(): Promise<{
    size: number;
    lastUpdate: number;
  }> {
    await this.cleanExpired();
    return {
      size: this.cache.size,
      lastUpdate: this.lastUpdate,
    };
  }
}

/**
 * Global singleton instance of the configuration cache
 *
 * Use this instance throughout the application for consistent caching.
 *
 * @example
 * ```ts
 * import { configCache } from '@/lib/config-cache';
 *
 * // Set a value
 * await configCache.set('key', 'value');
 *
 * // Get a value
 * const value = await configCache.get('key');
 * ```
 */
export const configCache = new ConfigCache();

/**
 * Type export for TypeScript usage
 */
export type { CachedValue };
export { ConfigCache };
