import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { importArchives } from '@/services/archive.service';
import { setLogContext, clearLogContext } from '@/lib/prisma-middleware';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

// POST /api/import - Import archives in bulk
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body = await request.json();
    const { archives } = body;

    if (!archives || !Array.isArray(archives) || archives.length === 0) {
      return NextResponse.json(
        { error: '档案数组不能为空' },
        { status: 400 }
      );
    }

    // Validate each archive
    const invalidArchives = archives.filter(
      (a: Record<string, unknown>) => !a.title || !a.fileUrl || !a.fileName || !a.fileSize
    );

    if (invalidArchives.length > 0) {
      return NextResponse.json(
        { error: '部分档案缺少必填字段' },
        { status: 400 }
      );
    }

    // Set log context for automatic logging（IP 通过 request 传入）
    setLogContext(session.user.username || 'user', session.user.id, request);

    try {
      // Import archives using service
      const results = await importArchives(archives, session.user.id);

      return NextResponse.json({
        results,
        message: `成功导入 ${results.success}/${archives.length} 个档案`,
      });
    } finally {
      // Clear log context
      clearLogContext();
    }
  } catch (error) {
    console.error('[Import] Error:', error);
    return NextResponse.json(
      { error: '导入失败' },
      { status: 500 }
    );
  }
}
