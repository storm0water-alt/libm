import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync } from 'fs';
import os from 'os';

const execAsync = promisify(exec);

export const runtime = 'nodejs';

/**
 * Get server hardware fingerprint for license binding
 * This identifies the physical host machine, not the browser or Docker container
 */
export async function GET() {
  try {
    // Collect multiple hardware identifiers to create a stable fingerprint
    const identifiers = await Promise.allSettled([
      getHostname(),
      getMachineId(),
      getCpuInfo(),
      getMacAddresses(),
      getSystemPlatform(),
      getDockerContainerId(),
    ]);

    // Extract successful values
    const hostname = identifiers[0].status === 'fulfilled' ? identifiers[0].value : '';
    const machineId = identifiers[1].status === 'fulfilled' ? identifiers[1].value : '';
    const cpuInfo = identifiers[2].status === 'fulfilled' ? identifiers[2].value : '';
    const macAddresses = identifiers[3].status === 'fulfilled' ? identifiers[3].value : '';
    const platform = identifiers[4].status === 'fulfilled' ? identifiers[4].value : '';
    const containerId = identifiers[5].status === 'fulfilled' ? identifiers[5].value : '';

    // Combine all identifiers to create unique fingerprint
    const fingerprint = [
      hostname,
      machineId,
      cpuInfo,
      macAddresses,
      platform,
      containerId,
    ].filter(Boolean).join('|');

    // If we couldn't get any hardware info, fall back to a timestamp-based ID
    if (!fingerprint) {
      const fallbackId = `HOST-${os.hostname()}-${Date.now()}`;
      return NextResponse.json({
        deviceCode: fallbackId,
        method: 'fallback',
        info: 'Could not detect hardware info, using fallback method',
      });
    }

    // Generate device code using the same logic as license service
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(fingerprint).digest('hex');
    const hash12 = hash.substring(0, 12);
    const deviceCode = `SRV-${hash12.slice(0, 4)}-${hash12.slice(4, 8)}-${hash12.slice(8, 12)}`.toUpperCase();

    return NextResponse.json({
      deviceCode,
      method: 'hardware',
      fingerprint: {
        hostname: hostname || 'unknown',
        machineId: machineId || 'unknown',
        cpuInfo: cpuInfo || 'unknown',
        platform: platform || 'unknown',
        containerId: containerId || 'not-in-docker',
      },
    });
  } catch (error) {
    console.error('[Device Fingerprint] Failed to get hardware info:', error);

    // Fallback to hostname + timestamp
    const fallbackId = `SRV-${os.hostname()}-${Date.now()}`;
    return NextResponse.json({
      deviceCode: fallbackId,
      method: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Get system hostname
 */
async function getHostname(): Promise<string> {
  try {
    const { stdout } = await execAsync('hostname');
    return stdout.trim();
  } catch {
    return os.hostname();
  }
}

/**
 * Get machine-id from Linux system
 */
async function getMachineId(): Promise<string> {
  try {
    const machineId = readFileSync('/etc/machine-id', 'utf-8').trim();
    return machineId;
  } catch {
    return '';
  }
}

/**
 * Get CPU information
 */
async function getCpuInfo(): Promise<string> {
  try {
    const { stdout } = await execAsync('cat /proc/cpuinfo | grep "model name" | head -1');
    const cpuModel = stdout.replace(/model name\s*:\s*/, '').trim();
    return cpuModel;
  } catch {
    return os.cpus()[0]?.model || '';
  }
}

/**
 * Get MAC addresses
 */
async function getMacAddresses(): Promise<string> {
  try {
    const interfaces = os.networkInterfaces();
    const macs: string[] = [];

    for (const name in interfaces) {
      for (const iface of interfaces[name]) {
        if (iface.mac && iface.mac !== '00:00:00:00:00:00') {
          macs.push(iface.mac);
        }
      }
    }

    // Sort to ensure consistent ordering and take first non-loopback MAC
    return macs.sort()[0] || '';
  } catch {
    return '';
  }
}

/**
 * Get system platform info
 */
async function getSystemPlatform(): Promise<string> {
  try {
    const { stdout } = await execAsync('uname -sr');
    return stdout.trim();
  } catch {
    return `${os.type()} ${os.release()} ${os.arch()}`;
  }
}

/**
 * Get Docker container ID (if running in Docker)
 */
async function getDockerContainerId(): Promise<string> {
  try {
    // Try to read Docker container ID from /proc/self/cgroup
    const cgroup = readFileSync('/proc/self/cgroup', 'utf-8');
    const match = cgroup.match(/docker\/([a-f0-9]{12})/);
    if (match) {
      return match[1];
    }

    // Try another method
    const hostname = readFileSync('/etc/hostname', 'utf-8').trim();
    if (hostname.length === 12) {
      return hostname; // Docker container ID is typically 12 characters
    }

    return '';
  } catch {
    return '';
  }
}
