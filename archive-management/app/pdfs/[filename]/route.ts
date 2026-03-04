import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { getPdfStoragePath } from "@/lib/storage-config";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

// GET /pdfs/[filename] - Serve PDF files from storage directory
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Get PDF storage path from centralized configuration
    const pdfStoragePath = getPdfStoragePath();

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

    // Debug logging
    console.log("[PDF Serve] Request for file:", filename);
    console.log("[PDF Serve] Storage path:", pdfStoragePath);
    console.log("[PDF Serve] Full file path:", filePath);
    console.log("[PDF Serve] File exists:", existsSync(filePath));

    // Check if file exists
    if (!existsSync(filePath)) {
      console.error("[PDF Serve] File not found:", filePath);
      console.error("[PDF Serve] Storage path used:", pdfStoragePath);
      console.error("[PDF Serve] Current working directory:", process.cwd());
      return NextResponse.json(
        { error: "File not found", path: filePath, storagePath: pdfStoragePath },
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
