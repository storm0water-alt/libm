"use client";

import { useState, useEffect } from "react";
import {
  getOrGenerateDeviceCode,
  verifyDeviceCode,
  collectDeviceInfo,
  type DeviceInfo,
} from "@/lib/device-fingerprint";

export interface UseDeviceFingerprintReturn {
  deviceCode: string | null;
  deviceInfo: DeviceInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  verify: (expectedCode: string) => Promise<boolean>;
}

/**
 * React Hook for device fingerprinting
 */
export function useDeviceFingerprint(): UseDeviceFingerprintReturn {
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);

    try {
      const code = await getOrGenerateDeviceCode();
      const info = await collectDeviceInfo();

      setDeviceCode(code);
      setDeviceInfo(info);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate device code"
      );
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await generate();
  };

  const verify = async (expectedCode: string): Promise<boolean> => {
    try {
      return await verifyDeviceCode(expectedCode);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to verify device code"
      );
      return false;
    }
  };

  useEffect(() => {
    generate();
  }, []);

  return {
    deviceCode,
    deviceInfo,
    loading,
    error,
    refresh,
    verify,
  };
}
