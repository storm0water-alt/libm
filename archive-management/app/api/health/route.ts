import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  // 记录开始
  console.log('[Health] Starting health check...');

  try {
    // 检查数据库连接
    const dbStatus = await checkDatabase();
    console.log('[Health] DB status:', dbStatus);

    // 检查 Redis 连接
    const redisStatus = await checkRedis();

    // 检查 Meilisearch 连接
    const meilisearchStatus = await checkMeilisearch();

    const isHealthy = dbStatus.healthy && redisStatus.healthy && meilisearchStatus.healthy;

    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbStatus,
        redis: redisStatus,
        meilisearch: meilisearchStatus,
      },
    }, {
      status: isHealthy ? 200 : 503,
    });
  } catch (error) {
    console.error('[Health] Fatal error:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }, {
      status: 503,
    });
  }
}

async function checkDatabase() {
  console.log('[Health] Checking database connection...');
  try {
    console.log('[Health] Prisma instance:', !!prisma);
    console.log('[Health] DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 30) + '...');
    await prisma.$queryRaw`SELECT 1`;
    console.log('[Health] Database connection successful!');
    return { healthy: true, message: 'Connected' };
  } catch (error) {
    console.error('[Health] Database connection failed:', error);
    return { healthy: false, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` };
  }
}

async function checkRedis() {
  try {
    if (!process.env.REDIS_URL) {
      return { healthy: true, message: 'Not configured' };
    }
    // 简单的 Redis 连接检查（将在后续任务中实现）
    return { healthy: true, message: 'Connected (check pending)' };
  } catch {
    return { healthy: false, message: 'Disconnected' };
  }
}

async function checkMeilisearch() {
  try {
    if (!process.env.MEILISEARCH_HOST) {
      return { healthy: true, message: 'Not configured' };
    }
    // 简单的 Meilisearch 连接检查（将在后续任务中实现）
    return { healthy: true, message: 'Connected (check pending)' };
  } catch {
    return { healthy: false, message: 'Disconnected' };
  }
}
