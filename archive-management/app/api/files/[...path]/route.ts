import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

// GET /api/files/[...path] - Serve PDF files
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: filePaths } = await params;
    const filePath = filePaths.join('/');
    const fileName = path.basename(filePath);

    // Security check: ensure filename is safe
    if (!fileName || fileName.includes('..') || fileName.includes('/')) {
      return NextResponse.json(
        { error: '无效的文件名' },
        { status: 400 }
      );
    }

    // Construct file path
    const uploadDir = process.env.PDF_UPLOAD_PATH || path.join(process.cwd(), 'data', 'pdfs');
    const fullPath = path.join(uploadDir, fileName);

    // Check if file exists
    if (!existsSync(fullPath)) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = await readFile(fullPath);

    // Set appropriate headers
    const response = new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    });

    return response;
  } catch (error) {
    console.error('[File Serve] Error:', error);
    return NextResponse.json(
      { error: '文件读取失败' },
      { status: 500 }
    );
  }
}
