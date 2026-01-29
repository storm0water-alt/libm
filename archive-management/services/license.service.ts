/**
 * License Service
 *
 * Provides license management functionality including:
 * - Device code generation from hardware fingerprint
 * - Auth code encryption/decryption using AES-256-GCM
 * - License validation and verification
 * - License activation, renewal, and deletion
 * - Cache integration for performance
 */

import { prisma } from "@/lib/prisma";
import { licenseCacheManager } from "@/lib/license-cache";
import { createHash, createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Get or generate secret key for encryption
function getSecretKey(): Buffer {
  const key = process.env.LICENSE_SECRET_KEY;
  if (!key) {
    // Fallback to a default key for development (not recommended for production)
    console.warn("LICENSE_SECRET_KEY not set, using default key for development");
    return Buffer.from("default-license-secret-key-32-bytes-long".substring(0, 32));
  }
  // Ensure key is exactly 32 bytes for AES-256
  return Buffer.from(createHash("sha256").update(key).digest().subarray(0, 32));
}

interface AuthCodePayload {
  deviceCode: string;
  durationDays: number;
  timestamp: number;
}

interface ValidateAuthCodeResult {
  valid: boolean;
  deviceCode?: string;
  durationDays?: number;
}

interface LicenseStatusResult {
  valid: boolean;
  expireTime?: Date;
}

export class LicenseService {
  /**
   * Generate device code from client-provided fingerprint
   * NOTE: This is used by admin for manual device code generation.
   * The actual device code used by the system is fetched from server-side API.
   */
  generateDeviceCode(fingerprint?: string): string {
    // If no fingerprint provided, generate a simple hash for development
    const input = fingerprint || `${Date.now()}-${Math.random()}`;
    const hash = createHash("sha256").update(input).digest("hex");
    // Take first 12 characters and format as SRV-XXXX-XXXX-XXXX
    const hash12 = hash.substring(0, 12);
    return `SRV-${hash12.slice(0, 4)}-${hash12.slice(4, 8)}-${hash12.slice(8, 12)}`.toUpperCase();
  }

  /**
   * Generate auth code using AES-256-GCM encryption
   * @param deviceCode Device code
   * @param durationDays License duration in days
   */
  generateAuthCode(deviceCode: string, durationDays: number): string {
    const payload: AuthCodePayload = {
      deviceCode,
      durationDays,
      timestamp: Date.now(),
    };

    const key = getSecretKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(JSON.stringify(payload), "utf8", "hex");
    encrypted += cipher.final("hex");
    const authTag = cipher.getAuthTag();

    // Combine: iv + authTag + encrypted
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, "hex"),
    ]);

    // Base64 encode and format for readability
    return combined
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "")
      .toUpperCase()
      .match(/.{1,4}/g)!
      .join("-");
  }

  /**
   * Validate auth code and extract payload
   * @param authCode Auth code to validate
   */
  validateAuthCode(authCode: string): ValidateAuthCodeResult {
    try {
      // Clean and parse auth code
      const cleaned = authCode.replace(/-/g, "").toLowerCase();
      const combined = Buffer.from(cleaned + "==", "base64");

      if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) {
        return { valid: false };
      }

      const iv = combined.subarray(0, IV_LENGTH);
      const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
      const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

      const key = getSecretKey();
      const decipher = createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      const payload: AuthCodePayload = JSON.parse(decrypted.toString("utf8"));

      return {
        valid: true,
        deviceCode: payload.deviceCode,
        durationDays: payload.durationDays,
      };
    } catch (error) {
      console.error("Auth code validation failed:", error);
      return { valid: false };
    }
  }

  /**
   * Check license status with caching
   */
  async checkLicense(deviceCode?: string): Promise<LicenseStatusResult> {
    // Try cache first
    const cached = licenseCacheManager.getCachedLicenseStatus(deviceCode);
    if (cached) {
      return {
        valid: cached.valid,
        expireTime: cached.expireTime ? new Date(cached.expireTime) : undefined,
      };
    }

    // Query database
    const whereClause = deviceCode ? { deviceCode } : {};
    const license = await prisma.license.findFirst({
      where: whereClause,
      orderBy: { expireTime: "desc" }, // Order by expire time, not creation time
    });

    if (!license) {
      const result = { valid: false };
      licenseCacheManager.setCachedLicenseStatus(result, deviceCode);
      return result;
    }

    const valid = license.expireTime > new Date();
    const result = { valid, expireTime: license.expireTime };

    // Update cache with device code
    licenseCacheManager.setCachedLicenseStatus(result, deviceCode);

    return result;
  }

  /**
   * Create license (admin only)
   */
  async createLicense(deviceCode: string, durationDays: number, name?: string) {
    const authCode = this.generateAuthCode(deviceCode, durationDays);
    const expireTime = new Date();
    expireTime.setDate(expireTime.getDate() + durationDays);

    const license = await prisma.license.create({
      data: {
        name: name || "未命名授权",
        deviceCode,
        authCode,
        expireTime,
      },
    });

    // Clear cache
    licenseCacheManager.clearLicenseStatusCache();

    return license;
  }

  /**
   * Activate license with auth code
   */
  async activateLicense(deviceCode: string, authCode: string): Promise<{ success: boolean; error?: string; expireTime?: Date }> {
    const result = this.validateAuthCode(authCode);

    if (!result.valid || !result.deviceCode || !result.durationDays) {
      return { success: false, error: "激活码无效" };
    }

    // Check if device code matches
    if (result.deviceCode !== deviceCode) {
      return { success: false, error: "设备码不匹配" };
    }

    // Calculate expire time
    const expireTime = new Date();
    expireTime.setDate(expireTime.getDate() + result.durationDays);

    // Create or update license
    await prisma.license.upsert({
      where: { deviceCode },
      create: {
        deviceCode,
        authCode,
        expireTime,
      },
      update: {
        authCode,
        expireTime,
      },
    });

    // Clear cache
    licenseCacheManager.clearLicenseStatusCache();

    return { success: true, expireTime };
  }

  /**
   * Renew license
   */
  async renewLicense(licenseId: string, additionalDays: number) {
    const license = await prisma.license.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new Error("授权不存在");
    }

    const newExpireTime = new Date(license.expireTime);
    newExpireTime.setDate(newExpireTime.getDate() + additionalDays);

    const updated = await prisma.license.update({
      where: { id: licenseId },
      data: { expireTime: newExpireTime },
    });

    // Clear cache
    licenseCacheManager.clearLicenseStatusCache();

    return updated;
  }

  /**
   * Delete license
   */
  async deleteLicense(licenseId: string) {
    const license = await prisma.license.delete({
      where: { id: licenseId },
    });

    // Clear cache
    licenseCacheManager.clearLicenseStatusCache();

    return license;
  }

  /**
   * Get all licenses
   */
  async getAllLicenses() {
    const licenses = await prisma.license.findMany({
      orderBy: { createdAt: "desc" },
    });

    return licenses.map((license) => ({
      ...license,
      isActive: license.expireTime > new Date(),
    }));
  }

  /**
   * Get license by device code
   */
  async getLicenseByDeviceCode(deviceCode: string) {
    const license = await prisma.license.findUnique({
      where: { deviceCode },
    });

    if (!license) {
      return null;
    }

    return {
      ...license,
      isActive: license.expireTime > new Date(),
    };
  }
}

// Export singleton instance
export const licenseService = new LicenseService();
