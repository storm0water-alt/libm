import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getPlatform,
  getQuickNavPaths,
  getDefaultBrowsePath,
} from "@/lib/platform";

export async function GET() {
  const session = await auth();

  if (!session) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const platform = getPlatform();
    const quickNavPaths = getQuickNavPaths();
    const defaultPath = getDefaultBrowsePath();

    return NextResponse.json({
      success: true,
      data: {
        platform,
        quickNavPaths,
        defaultPath,
      },
    });
  } catch (error) {
    console.error("Platform detection error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to detect platform" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
