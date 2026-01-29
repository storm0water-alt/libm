import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getArchiveById } from "@/services/archive.service";
import { logArchiveDownload } from "@/services/archive.service";

export const runtime = 'nodejs';

/**
 * GET /api/archives/[id]/pdf
 *
 * Returns the PDF file URL for an archive
 * This endpoint serves as a proxy to validate access and log downloads
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    // Get archive ID from params
    const archiveId = params.id;

    if (!archiveId) {
      return NextResponse.json({ error: "档案ID无效" }, { status: 400 });
    }

    // Get archive from database
    const archive = await getArchiveById(archiveId);

    if (!archive) {
      return NextResponse.json({ error: "档案不存在" }, { status: 404 });
    }

    // Check if PDF file exists
    if (!archive.fileUrl) {
      return NextResponse.json({ error: "该档案没有关联的PDF文件" }, { status: 404 });
    }

    // Log the download/view operation
    await logArchiveDownload(archiveId, session.user.id);

    // Return the PDF file URL
    // In a real implementation, you might want to:
    // 1. Stream the file directly from storage
    // 2. Add watermarks dynamically
    // 3. Validate file access permissions
    // 4. Handle CDN URLs

    return NextResponse.json({
      success: true,
      fileUrl: archive.fileUrl,
      fileName: `${archive.archiveNo}.pdf`,
      mimeType: "application/pdf",
    });
  } catch (error) {
    console.error("[Archive PDF API] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "获取PDF文件失败" },
      { status: 500 }
    );
  }
}
