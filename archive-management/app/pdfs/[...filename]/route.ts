import { NextRequest, NextResponse } from "next/server";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { getPdfStoragePath, parseBucketFileUrl } from "@/lib/storage-config";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

// GET /pdfs/[...filename] - Serve PDF files from storage directory
// Supports both bucket storage format (/pdfs/{year}-{bucket}/{archiveID}.pdf) and legacy format (/pdfs/{archiveID}.pdf)
// Uses catch-all route [...filename] to match multi-segment paths like "2021-5/abc123.pdf"
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string[] }> }
) {
  try {
    const { filename: filenameParts } = await params;

    // Join the path segments back together
    // e.g., ["2021-5", "abc123.pdf"] -> "2021-5/abc123.pdf"
    const filename = filenameParts.join("/");

    const pdfStoragePath = getPdfStoragePath();

    // Security: only allow .pdf files
    if (!filename.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 403 }
      );
    }

    // Security: validate filename format
    // Allow bucket format: {year}-{bucket}/{archiveID}.pdf (e.g., "2026-2/abc123.pdf")
    // Allow legacy format: {archiveID}.pdf (e.g., "abc123.pdf")
    // Block directory traversal attacks (../) and absolute paths

    // Check for directory traversal
    if (filename.includes("..")) {
      return NextResponse.json(
        { error: "Invalid filename: directory traversal not allowed" },
        { status: 403 }
      );
    }

    // Try bucket storage format first: {year}-{bucket}/{archiveID}.pdf
    // Parse from filename like "2026-0/abc123.pdf" or legacy "abc123.pdf"
    const bucketInfo = parseBucketFileUrl(filename);

    // For non-bucket format, sanitize the filename (remove any path separators)
    const safeFilename = bucketInfo ? filename : filename.replace(/[\/\\]/g, "");

    let filePath: string;
    let bucketPath = "";

    if (bucketInfo) {
      // New bucket storage format
      bucketPath = join(pdfStoragePath, `${bucketInfo.year}-${bucketInfo.bucketNumber}`);
      filePath = join(bucketPath, `${bucketInfo.archiveId}.pdf`);
    } else {
      // Legacy format: direct filename in root storage
      filePath = join(pdfStoragePath, safeFilename);
    }

    // Debug logging
    console.log("[PDF Serve] Request for file:", filename);
    console.log("[PDF Serve] Storage path:", pdfStoragePath);
    console.log("[PDF Serve] Bucket path:", bucketPath || "(root storage)");
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
