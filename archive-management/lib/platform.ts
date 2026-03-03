import { execSync } from "child_process";
import { existsSync } from "fs";
import { platform } from "os";

/**
 * Platform detection and cross-platform path utilities
 */

export type Platform = "win32" | "darwin" | "linux" | "unknown";

// Cache for Windows drives (refreshed every 5 minutes)
let cachedDrives: string[] | null = null;
let drivesCacheTime = 0;
const DRIVES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get the current platform
 */
export function getPlatform(): Platform {
  const p = platform();
  if (p === "win32") return "win32";
  if (p === "darwin") return "darwin";
  if (p === "linux") return "linux";
  return "unknown";
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return getPlatform() === "win32";
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  return getPlatform() === "darwin";
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return getPlatform() === "linux";
}

/**
 * Get Windows drive letters (e.g., ["C:", "D:", "E:"])
 * Returns empty array on non-Windows platforms
 * Uses caching to avoid slow PowerShell calls on every request
 */
export function getWindowsDrives(): string[] {
  if (!isWindows()) return [];

  // Return cached result if still valid
  const now = Date.now();
  if (cachedDrives && (now - drivesCacheTime) < DRIVES_CACHE_TTL) {
    return cachedDrives;
  }

  const drives: string[] = [];

  // Method 1: Check common drive letters directly (fastest, no subprocess)
  const commonDrives = ["C:", "D:", "E:", "F:", "G:"];
  for (const drive of commonDrives) {
    try {
      if (existsSync(drive + "\\")) {
        drives.push(drive);
      }
    } catch {
      // Ignore errors
    }
  }

  // If we found drives using existsSync, use them (no need for PowerShell)
  if (drives.length > 0) {
    cachedDrives = drives;
    drivesCacheTime = now;
    console.log(`[Platform] Detected Windows drives (fast method):`, drives);
    return drives;
  }

  // Method 2: Fallback to PowerShell if existsSync somehow failed
  try {
    console.log("[Platform] Fast drive detection failed, trying PowerShell...");
    const output = execSync(
      "powershell -NoProfile -Command \"Get-PSDrive -PSProvider FileSystem | Select-Object -ExpandProperty Root\"",
      {
        encoding: "utf-8",
        timeout: 5000,
        windowsHide: true,
      }
    );

    const psDrives = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^[A-Z]:\\?$/.test(line))
      .map((d) => d.replace(/\\$/, ""))
      .sort();

    if (psDrives.length > 0) {
      cachedDrives = psDrives;
      drivesCacheTime = now;
      console.log(`[Platform] Detected Windows drives (PowerShell):`, psDrives);
      return psDrives;
    }
  } catch (error) {
    console.warn("[Platform] PowerShell drive detection failed:", error);
  }

  // Method 3: Last resort - return C: if nothing else works
  const fallback = ["C:"];
  cachedDrives = fallback;
  drivesCacheTime = now;
  console.log("[Platform] Using fallback drive: C:");
  return fallback;
}

/**
 * Force refresh the drives cache (useful after USB drive insertion, etc.)
 */
export function refreshWindowsDrivesCache(): void {
  cachedDrives = null;
  drivesCacheTime = 0;
}

/**
 * Get default root paths for the current platform
 */
export function getDefaultRootPaths(): string[] {
  const currentPlatform = getPlatform();
  
  switch (currentPlatform) {
    case "win32": {
      // Windows: Return all available drive letters
      const drives = getWindowsDrives();
      return drives.length > 0 ? drives : ["C:"];
    }
    case "darwin":
      // macOS: Root, Volumes (external drives), Users home
      return ["/", "/Volumes", "/Users"];
    case "linux":
      // Linux: Root, mount points, home
      return ["/", "/mnt", "/home"];
    default:
      return ["/"];
  }
}

/**
 * Get common quick navigation paths for the current platform
 */
export function getQuickNavPaths(): Array<{ path: string; label: string }> {
  const currentPlatform = getPlatform();
  
  switch (currentPlatform) {
    case "win32": {
      const drives = getWindowsDrives();
      const paths: Array<{ path: string; label: string }> = [];
      
      // Add all available drives
      drives.forEach((drive) => {
        paths.push({
          path: drive + "\\",
          label: `${drive}\\ (Local Disk)`,
        });
      });
      
      return paths;
    }
    case "darwin":
      return [
        { path: "/", label: "Root (/)" },
        { path: "/Volumes", label: "Volumes (External Drives)" },
        { path: "/Users", label: "Users (Home Directories)" },
      ];
    case "linux":
      return [
        { path: "/", label: "Root (/)" },
        { path: "/mnt", label: "Mount (External Drives)" },
        { path: "/home", label: "Home (User Directories)" },
      ];
    default:
      return [
        { path: "/", label: "Root (/)" },
      ];
  }
}

/**
 * Get allowed base paths for file system browsing
 * These are the root directories that users are allowed to browse
 */
export function getAllowedBasePaths(): string[] {
  const currentPlatform = getPlatform();
  const cwd = process.cwd();
  
  switch (currentPlatform) {
    case "win32": {
      // Windows: Allow all drive roots + current working directory
      const drives = getWindowsDrives();
      const roots = drives.map((d) => d + "\\");
      return [...roots, cwd];
    }
    case "darwin":
      // macOS: Allow standard Unix paths + Volumes + cwd
      return ["/", "/Volumes", "/mnt", "/home", "/Users", cwd];
    case "linux":
      // Linux: Allow standard paths + cwd
      return ["/", "/mnt", "/home", cwd];
    default:
      return ["/", cwd];
  }
}

/**
 * Get the default starting path for browsing
 */
export function getDefaultBrowsePath(): string {
  const currentPlatform = getPlatform();
  
  switch (currentPlatform) {
    case "win32": {
      // Windows: Start with first available drive (usually C:)
      const drives = getWindowsDrives();
      return drives.length > 0 ? drives[0] + "\\" : "C:\\";
    }
    case "darwin":
    case "linux":
    default:
      // Unix-like: Start at root
      return "/";
  }
}

/**
 * Normalize a path for the current platform
 * Handles both forward and backward slashes
 * IMPORTANT: Uses path.sep to avoid escape sequence issues in Windows paths
 */
export function normalizePath(inputPath: string): string {
  if (!inputPath) return getDefaultBrowsePath();

  // On Windows, convert forward slashes to backslashes
  // Use String split/join to avoid regex escape issues with backslash
  if (isWindows()) {
    // Split by forward slash and join with backslash
    // This avoids issues with escape sequences like \00, \n, \t in paths
    return inputPath.split("/").join("\\");
  }

  // On Unix, convert backslashes to forward slashes
  return inputPath.split("\\").join("/");
}

/**
 * Normalize Windows drive path to consistent format (e.g., "C:" -> "C:\")
 */
function normalizeWindowsDrivePath(path: string): string {
  if (!isWindows()) return path;

  // Handle Windows drive root paths: "C:" should become "C:\"
  if (/^[A-Z]:$/.test(path)) {
    return path + "\\";
  }
  return path;
}

/**
 * Check if a path is allowed based on base paths
 * Also checks for Windows drive roots that might have been mounted after cache
 */
export function isPathAllowed(targetPath: string): boolean {
  let normalizedTarget = normalizePath(targetPath);

  // Normalize Windows drive paths (C: -> C:\)
  normalizedTarget = normalizeWindowsDrivePath(normalizedTarget);

  // Debug: show actual character codes for troubleshooting
  console.log(`[Platform] isPathAllowed check for: "${normalizedTarget}"`);
  console.log(`[Platform] First 20 chars:`, normalizedTarget.substring(0, 20).split('').map(c => c.charCodeAt(0)).join(','));

  // Special case for Windows: allow any existing drive root
  // This handles newly mounted drives that aren't in the cache
  if (isWindows() && /^[A-Z]:\\$/.test(normalizedTarget)) {
    if (existsSync(normalizedTarget)) {
      console.log(`[Platform] Allowing Windows drive root: ${normalizedTarget}`);
      return true;
    }
  }

  // Special case for Windows: allow any subdirectory of an existing drive
  // Check if path starts with X:\ where X is any drive letter
  if (isWindows()) {
    const driveMatch = normalizedTarget.match(/^([A-Z]):\\/);
    if (driveMatch) {
      const driveRoot = driveMatch[1] + ":\\";
      if (existsSync(driveRoot)) {
        console.log(`[Platform] Allowing Windows path under drive: ${driveRoot}`);
        return true;
      }
    }
  }

  const allowedBasePaths = getAllowedBasePaths();

  return allowedBasePaths.some((basePath) => {
    let normalizedBase = normalizePath(basePath);
    normalizedBase = normalizeWindowsDrivePath(normalizedBase);

    // Check exact match
    if (normalizedTarget === normalizedBase) {
      return true;
    }

    // Check if target is a subdirectory of base
    const separator = isWindows() ? "\\" : "/";
    if (normalizedTarget.startsWith(normalizedBase + separator)) {
      return true;
    }

    return false;
  });
}
