import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { processCSVUpload } from '@/services/csv-import.service';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

// POST /api/import/csv - Upload and process CSV file to update archive information
export async function POST(request: Request) {
  try {
    console.log('[CSV Import API] Starting CSV import...');

    const session = await auth();

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "管理员")) {
      console.error('[CSV Import API] Permission denied for user:', session?.user);
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    console.log('[CSV Import API] User authenticated:', session.user.username);

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.error('[CSV Import API] No file provided');
      return NextResponse.json(
        { error: '请选择 CSV 文件' },
        { status: 400 }
      );
    }

    console.log('[CSV Import API] File received:', file.name, file.size);

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      console.error('[CSV Import API] Invalid file type:', file.name);
      return NextResponse.json(
        { error: '文件格式错误，请上传 CSV 文件' },
        { status: 400 }
      );
    }

    // Use the CSV import service
    const result = await processCSVUpload(file, session.user.username, session.user.id);

    if (result.success) {
      return NextResponse.json({
        success: true,
        importRecordId: result.importRecordId,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'CSV 导入失败' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[CSV Import API] Error:', error);
    console.error('[CSV Import API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Log more details about the error
    if (error instanceof Error) {
      console.error('[CSV Import API] Error name:', error.name);
      console.error('[CSV Import API] Error message:', error.message);
    }

    return NextResponse.json(
      {
        error: 'CSV 导入失败',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET /api/import/csv/:importRecordId - Get CSV import progress
export async function GET(
  request: Request,
  { params }: { params: Promise<{ importRecordId: string }> }
) {
  try {
    console.log('[CSV Import API] GET request received');

    const session = await auth();

    console.log('[CSV Import API] GET session:', session?.user?.username);

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "管理员")) {
      console.error('[CSV Import API] GET Permission denied');
      return NextResponse.json(
        { error: '权限不足' },
        { status: 403 }
      );
    }

    const { importRecordId } = await params;
    console.log('[CSV Import API] GET importRecordId:', importRecordId);

    const importRecord = await prisma.importRecord.findUnique({
      where: { id: importRecordId },
    });

    if (!importRecord) {
      console.error('[CSV Import API] GET Import record not found:', importRecordId);
      return NextResponse.json(
        { error: '导入记录不存在' },
        { status: 404 }
      );
    }

    console.log('[CSV Import API] GET Import record found:', importRecord.status);

    return NextResponse.json({
      id: importRecord.id,
      fileName: importRecord.fileName,
      total: importRecord.total,
      processed: importRecord.processed,
      failed: importRecord.failed,
      status: importRecord.status,
      errors: importRecord.errors,
      createdAt: importRecord.createdAt,
      updatedAt: importRecord.updatedAt,
    });
  } catch (error) {
    console.error('[CSV Import API] GET Error:', error);
    return NextResponse.json(
      { error: '获取导入记录失败' },
      { status: 500 }
    );
  }
}
