import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

// GET /pdfs/[filename] - Serve PDF files from storage directory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Get PDF storage path from environment variable
    const pdfStoragePath = process.env.PDF_STORAGE_PATH || join(process.cwd(), "public", "pdfs");

    // Security: only allow .pdf files
    if (!filename.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 403 }
      );
    }

    // Prevent directory traversal attacks
    const safeFilename = filename.replace(/\.\./g, "").replace(/[\/\\]/g, "");
    const filePath = join(pdfStoragePath, safeFilename);

    // Check if file exists
    if (!existsSync(filePath)) {
      console.error("[PDF Serve] File not found:", filePath);
      return NextResponse.json(
        { error: "File not found", path: filePath },
        { status: 404 }
      );
    }

    // Read file and serve with correct headers
    const fileBuffer = readFileSync(filePath);

    console.log("[PDF Serve] Serving file:", filePath, `(${fileBuffer.length} bytes)`);

    // Set cache headers for better performance
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[PDF Serve] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
