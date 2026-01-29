/**
 * License Cache Manager
 *
 * Provides in-memory caching for license status to improve performance
 * and reduce database queries.
 */

export interface CachedLicenseStatus {
  valid: boolean;
  expireTime?: Date | string;
  cachedAt: number;
}

class LicenseCacheManager {
  private cache = new Map<string, { value: string; expiry: number }>();
  private licenseStatusCacheMap = new Map<string, { status: Omit<CachedLicenseStatus, 'cachedAt'>; cachedAt: number }>();
  private STATUS_CACHE_TTL = 300; // 5 minutes

  /**
   * Get cached value by key
   */
  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set cache value with TTL
   */
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete cache key
   */
  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Get cached license status for a specific device code
   */
  getCachedLicenseStatus(deviceCode?: string): CachedLicenseStatus | null {
    const key = deviceCode || "default";

    const cached = this.licenseStatusCacheMap.get(key);
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    const age = (now - cached.cachedAt) / 1000; // Convert to seconds

    if (age > this.STATUS_CACHE_TTL) {
      this.licenseStatusCacheMap.delete(key);
      return null;
    }

    return {
      ...cached.status,
      cachedAt: cached.cachedAt,
    };
  }

  /**
   * Set cached license status for a specific device code
   */
  setCachedLicenseStatus(status: Omit<CachedLicenseStatus, 'cachedAt'>, deviceCode?: string): void {
    const key = deviceCode || "default";
    this.licenseStatusCacheMap.set(key, {
      status,
      cachedAt: Date.now(),
    });
  }

  /**
   * Clear license status cache for a specific device code or all
   */
  clearLicenseStatusCache(deviceCode?: string): void {
    if (deviceCode) {
      this.licenseStatusCacheMap.delete(deviceCode);
    } else {
      this.licenseStatusCacheMap.clear();
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    this.cache.clear();
    this.licenseStatusCacheMap.clear();
  }
}

// Export singleton instance
export const licenseCacheManager = new LicenseCacheManager();
