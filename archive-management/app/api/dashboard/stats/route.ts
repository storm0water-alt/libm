import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export const dynamic = 'force-dynamic';

// GET /api/dashboard/stats - Get dashboard statistics
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get today's start and end
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    // Fetch statistics in parallel
    const [
      totalArchives,
      todayOperations,
      activeUsers,
      license,
      recentArchives,
      recentLogs,
      retentionDistribution,
    ] = await Promise.all([
      // Total archives count
      prisma.archive.count({}),

      // Today's operations count
      prisma.operationLog.count({
        where: {
          createdAt: {
            gte: today,
            lte: todayEnd,
          },
        },
      }),

      // Active users (created in last 30 days)
      prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // License status
      prisma.license.findFirst({
        where: {
          expireTime: {
            gte: new Date(),
          },
        },
        orderBy: {
          expireTime: 'desc',
        },
      }),

      // Recent archives (last 5)
      prisma.archive.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          archiveID: true,
          archiveNo: true,
          title: true,
          createdAt: true,
        },
      }),

      // Recent operation logs (last 5)
      prisma.operationLog.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          action: true,
          entityType: true,
          description: true,
          operator: true,
          createdAt: true,
        },
      }),

      // Archive distribution by retention period
      prisma.archive.groupBy({
        by: ['retentionPeriod'],
        _count: {
          retentionPeriod: true,
        },
      }),
    ]);

    console.log('[Dashboard Stats] Fetched data:', {
      totalArchives,
      todayOperations,
      activeUsers,
      today,
      todayEnd,
    });

    return NextResponse.json({
      totalArchives,
      todayOperations,
      activeUsers,
      licenseStatus: {
        valid: !!license,
        expireTime: license?.expireTime || null,
      },
      recentArchives: recentArchives.map((archive) => ({
        id: archive.archiveID,
        title: archive.title,
        meta: archive.archiveNo || '无档号',
        time: formatDate(archive.createdAt),
      })),
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        title: `${log.operator} ${getActionText(log.action)}`,
        meta: log.description || log.entityType,
        time: formatDate(log.createdAt),
      })),
      retentionDistribution: retentionDistribution.map((item) => ({
        name: item.retentionPeriod,
        value: item._count.retentionPeriod,
      })),
    });
  } catch (error) {
    console.error('[Dashboard Stats] Error:', error);
    console.error('[Dashboard Stats] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch statistics',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Helper function to format date
function formatDate(date: Date): string {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hours}:${minutes}`;
}

// Helper function to get action text in Chinese
function getActionText(action: string): string {
  const actionMap: Record<string, string> = {
    create: '创建了',
    modify: '修改了',
    delete: '删除了',
    view: '查看了',
    download: '下载了',
    upload: '上传了',
    import: '导入了',
    export: '导出了',
  };
  return actionMap[action] || action;
}
