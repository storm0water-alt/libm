import { NextRequest, NextResponse } from "next/server";
import { readdir, stat } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { auth } from "@/auth";

/**
 * Browse server file system
 * Query params:
 * - path: directory path to list (default: /)
 */
export async function GET(request: NextRequest) {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    return NextResponse.json(
      { success: false, error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get("path") || "/";

    // Security: only allow specific base paths
    const allowedBasePaths = [
      "/",
      "/Volumes",
      "/mnt",
      "/home",
      "/Users",
      process.cwd(),
    ];

    const isAllowed = allowedBasePaths.some(basePath =>
      path === basePath || path.startsWith(basePath + "/")
    );

    if (!isAllowed) {
      return NextResponse.json(
        { success: false, error: "Access denied" },
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

    // Filter out nulls and sort (directories first, then alphabetically)
    const validItems = items
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

    // Get parent path
    const parentPath = path === "/" ? null : join(path, "..");

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
