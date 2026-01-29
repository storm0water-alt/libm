import { NextResponse } from 'next/server';
import { auth } from '@/auth';
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
