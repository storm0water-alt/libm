import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { auth } from "@/auth";
import {
  getAllowedBasePaths,
  getDefaultBrowsePath,
  isPathAllowed,
  normalizePath,
} from "@/lib/platform";

export async function GET(request: NextRequest) {
  console.log("[Browse] API called");

  const session = await auth();
  console.log("[Browse] Session:", session ? { user: session.user.username, role: session.user.role } : null);

  if (!session || session.user.role !== "admin") {
    console.log("[Browse] Forbidden - not admin");
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const rawPath = searchParams.get("path");
    const path = rawPath ? normalizePath(rawPath) : getDefaultBrowsePath();
    
    // Get filter parameters
    const minSize = searchParams.get("minSize");
    const maxSize = searchParams.get("maxSize");
    const namePattern = searchParams.get("namePattern");

    console.log("[Browse] Raw path:", rawPath);
    console.log("[Browse] Normalized path:", path);
    console.log("[Browse] Filters:", { minSize, maxSize, namePattern });

    const allowedPaths = getAllowedBasePaths();
    console.log("[Browse] Allowed base paths:", allowedPaths);

    const allowed = isPathAllowed(path);
    console.log("[Browse] Is path allowed:", allowed);

    if (!allowed) {
      console.log("[Browse] Access denied for path:", path);
      return NextResponse.json(
        { success: false, error: "Access denied", debug: { path, allowedPaths } },
        { status: 403 }
      );
    }

    if (!existsSync(path)) {
      return NextResponse.json(
        { success: false, error: "Directory not found" },
        { status: 404 }
      );
    }

    const stats = await stat(path);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { success: false, error: "Not a directory" },
        { status: 400 }
      );
    }

    const entries = await readdir(path, { withFileTypes: true });

    const items = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(path, entry.name);
        try {
          const entryStat = await stat(fullPath);
          return {
            name: entry.name,
            path: fullPath,
            isDirectory: entry.isDirectory(),
            size: entryStat.size,
            modified: entryStat.mtime,
          };
        } catch {
          return null;
        }
      })
    );

    const validItems = items
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => {
        // Hide hidden files and folders (starting with .)
        if (item.name.startsWith('.')) return false;
        
        // Apply namePattern to both files and directories
        if (namePattern) {
          try {
            const regex = new RegExp(namePattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
            if (!regex.test(item.name)) return false;
          } catch {
            // Invalid regex, skip pattern matching
          }
        }
        
        // Apply size filters only to files
        if (!item.isDirectory) {
          if (minSize && item.size < parseInt(minSize)) return false;
          if (maxSize && item.size > parseInt(maxSize)) return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

    const allowedBasePaths = getAllowedBasePaths();
    const parentPath = allowedBasePaths.includes(path)
      ? null
      : join(path, "..");

    return NextResponse.json({
      success: true,
      data: {
        currentPath: path,
        parentPath,
        items: validItems,
      },
    });
  } catch (error) {
    console.error("Browse error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to browse directory",
      },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
