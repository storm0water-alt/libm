"use server";

import { auth } from "@/auth";
import { licenseService } from "@/services/license.service";

/**
 * Get device code for the current server
 * This action returns the server's hardware-based device code
 */
export async function getDeviceCode() {
  try {
    // Call the server-side device fingerprint API
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/device-fingerprint`);
    if (!response.ok) {
      throw new Error('Failed to fetch device code');
    }

    const data = await response.json();
    return { success: true, deviceCode: data.deviceCode, info: data };
  } catch (error) {
    console.error("Failed to get device code:", error);
    return { success: false, error: "获取设备码失败" };
  }
}

/**
 * Check license status
 */
export async function checkLicenseStatus(deviceCode?: string) {
  try {
    const status = await licenseService.checkLicense(deviceCode);
    return { success: true, ...status };
  } catch (error) {
    console.error("Failed to check license status:", error);
    return { success: false, valid: false, error: "检查授权状态失败" };
  }
}

/**
 * Activate license with auth code
 */
export async function activateLicense(deviceCode: string, authCode: string) {
  try {
    const result = await licenseService.activateLicense(deviceCode, authCode);
    return result;
  } catch (error) {
    console.error("Failed to activate license:", error);
    return { success: false, error: "激活授权失败" };
  }
}

/**
 * Create license (admin only)
 */
export async function createLicense(deviceCode: string, durationDays: number, name?: string) {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "管理员")) {
      return { success: false, error: "权限不足" };
    }

    const license = await licenseService.createLicense(deviceCode, durationDays, name);
    return { success: true, license };
  } catch (error) {
    console.error("Failed to create license:", error);
    return { success: false, error: "创建授权失败" };
  }
}

/**
 * Get all licenses (admin only)
 */
export async function getAllLicenses() {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "管理员")) {
      return { success: false, error: "权限不足", licenses: [] };
    }

    const licenses = await licenseService.getAllLicenses();
    return { success: true, licenses };
  } catch (error) {
    console.error("Failed to get licenses:", error);
    return { success: false, error: "获取授权列表失败", licenses: [] };
  }
}

/**
 * Renew license (admin only)
 */
export async function renewLicense(licenseId: string, additionalDays: number) {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "管理员")) {
      return { success: false, error: "权限不足" };
    }

    const license = await licenseService.renewLicense(licenseId, additionalDays);
    return { success: true, license };
  } catch (error) {
    console.error("Failed to renew license:", error);
    return { success: false, error: "续期授权失败" };
  }
}

/**
 * Delete license (admin only)
 */
export async function deleteLicense(licenseId: string) {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "管理员")) {
      return { success: false, error: "权限不足" };
    }

    const license = await licenseService.deleteLicense(licenseId);
    return { success: true, license };
  } catch (error) {
    console.error("Failed to delete license:", error);
    return { success: false, error: "删除授权失败" };
  }
}
