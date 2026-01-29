import { NextResponse } from "next/server";
import { initializeMeilisearch } from "@/services/meilisearch.service";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

// POST /api/search/init - Initialize Meilisearch index
export async function POST() {
  try {
    const result = await initializeMeilisearch();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Meilisearch index initialized successfully",
        indexed: result.indexed,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[Meilisearch Init] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
