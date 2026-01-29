import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { queryArchives, logArchiveDownload } from "@/services/archive.service";
import { setLogContext, clearLogContext } from "@/lib/prisma-middleware";
import { getClientIp } from "@/services/log.service";
import archiver from "archiver";
import { existsSync } from "fs";
import { join } from "path";

export const runtime = "nodejs";

/**
 * POST /api/archives/export
 *
 * Batch export archives as a ZIP file
 *
 * Body: { ids: string[] }
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: "请选择要导出的档案" }, { status: 400 });
    }

    const maxExportCount = parseInt(process.env.MAX_EXPORT_COUNT || "100", 10);

    if (ids.length > maxExportCount) {
      return Response.json(
        { error: `单次最多导出${maxExportCount}个档案` },
        { status: 400 }
      );
    }

    // Set log context
    const clientIp = getClientIp({ headers: request.headers } as Request);
    setLogContext(
      session.user.username || session.user.name || "user",
      session.user.id,
      undefined,
      clientIp
    );

    try {
      // Get archives by IDs
      const archives = await queryArchives({
        page: 1,
        pageSize: maxExportCount,
      });

      // Filter archives that match the IDs and have PDF files
      const archivesToExport = archives.items.filter(
        (archive) =>
          ids.includes(archive.archiveID) && archive.fileUrl && archive.fileUrl.trim() !== ""
      );

      if (archivesToExport.length === 0) {
        return Response.json({ error: "所选档案没有可导出的PDF文件" }, { status: 400 });
      }

      // Log download for each archive
      for (const archive of archivesToExport) {
        await logArchiveDownload(
          archive.archiveID,
          session.user.username || session.user.name || "user",
          session.user.id,
          clientIp
        );
      }

      // Collect chunks for the ZIP file
      const chunks: Buffer[] = [];

      // Create ZIP file
      const zip = archiver("zip", {
        zlib: { level: 9 }, // Maximum compression
      });

      // Collect data chunks
      zip.on("data", (chunk) => {
        chunks.push(chunk);
      });

      // Handle ZIP errors
      zip.on("error", (err) => {
        console.error("[Export API] ZIP error:", err);
      });

      zip.on("warning", (err) => {
        if (err.code !== "ENOENT") {
          console.warn("[Export API] ZIP warning:", err);
        }
      });

      // Track missing files
      const missingFiles: string[] = [];
      const invalidUrls: string[] = [];
      let fileCount = 0;

      // Add files to ZIP
      for (const archive of archivesToExport) {
        console.log(`[Export API] Processing archive: ${archive.archiveNo}, fileUrl: ${archive.fileUrl}`);

        // Extract file path from fileUrl
        let filePath = archive.fileUrl!;

        // If it's a URL, extract the path
        if (filePath.startsWith("http")) {
          try {
            const url = new URL(filePath);
            filePath = url.pathname;
          } catch {
            // Invalid URL, use as-is
            console.warn(`[Export API] Invalid URL for ${archive.archiveNo}: ${filePath}`);
            invalidUrls.push(archive.archiveNo);
            continue;
          }
        }

        // fileUrl format: /pdfs/xxx.pdf
        // Extract just the filename (remove /pdfs/ prefix)
        const filename = filePath.split("/").pop() || filePath;

        // Get PDF storage path from environment variable
        const pdfStoragePath = process.env.PDF_STORAGE_PATH || join(process.cwd(), "public", "pdfs");

        // Full file system path
        const fullPath = join(pdfStoragePath, filename);
        console.log(`[Export API] Full path: ${fullPath}, exists: ${existsSync(fullPath)}`);

        if (existsSync(fullPath)) {
          const fileName = `${archive.archiveNo}.pdf`;
          zip.file(fullPath, { name: fileName });
          fileCount++;
        } else {
          missingFiles.push(archive.archiveNo);
        }
      }

      console.log(`[Export API] Total archives: ${archivesToExport.length}, Found files: ${fileCount}, Missing: ${missingFiles.length}, Invalid URLs: ${invalidUrls.length}`);

      if (fileCount === 0) {
        return Response.json({ error: "没有找到可导出的PDF文件" }, { status: 400 });
      }

      // Log if some files were missing
      if (missingFiles.length > 0) {
        console.warn(
          `[Export API] Missing files for archives: ${missingFiles.join(", ")}`
        );
      }

      // Finalize the ZIP and wait for completion
      await new Promise<void>((resolve, reject) => {
        zip.on("end", () => {
          console.log(`[Export API] ZIP archived ${zip.pointer()} bytes, ${fileCount} files`);
          resolve();
        });
        zip.on("error", reject);
        zip.finalize();
      });

      // Combine all chunks into a single buffer
      const zipBuffer = Buffer.concat(chunks);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const zipFileName = `archives_export_${timestamp}.zip`;

      // Return the ZIP file as a Blob
      return new Response(zipBuffer, {
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(zipFileName)}"`,
          "Content-Length": zipBuffer.length.toString(),
          "Cache-Control": "no-cache",
        },
      });
    } finally {
      clearLogContext();
    }
  } catch (error) {
    console.error("[Export API] Error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "导出失败" },
      { status: 500 }
    );
  }
}
