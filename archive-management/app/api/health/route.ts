import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getClient, getConfig } from '@/lib/meilisearch';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** 单个依赖检查的超时（毫秒），避免健康检查被无响应的依赖拖死 */
const CHECK_TIMEOUT_MS = Number(process.env.HEALTH_CHECK_TIMEOUT_MS ?? 5000);

/**
 * Meilisearch 是否参与总体健康判定。
 * 设为 false 时：Meilisearch 异常只体现在 services 里，不拉低整体状态
 * （适用于"搜索可退化、核心功能仍可用"的部署）。
 */
const meilisearchRequired = process.env.HEALTH_REQUIRE_MEILISEARCH !== 'false';

interface ServiceStatus {
  healthy: boolean;
  message: string;
  latencyMs?: number;
  url?: string;
  index?: string;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label}超时（>${ms}ms）`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

/** 从 Meilisearch 客户端错误里取出 HTTP 状态码（无则返回 undefined） */
function httpStatusOf(error: unknown): number | undefined {
  const response = (error as { response?: { status?: number } })?.response;
  return typeof response?.status === 'number' ? response.status : undefined;
}

async function checkDatabase(): Promise<ServiceStatus> {
  const startedAt = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, CHECK_TIMEOUT_MS, '数据库检查');
    return { healthy: true, message: 'Connected', latencyMs: Date.now() - startedAt };
  } catch (error) {
    console.error('[Health] 数据库检查失败:', toMessage(error));
    return {
      healthy: false,
      message: `Error: ${toMessage(error)}`,
      latencyMs: Date.now() - startedAt,
    };
  }
}

async function checkMeilisearch(): Promise<ServiceStatus> {
  const startedAt = Date.now();
  const { url, indexName } = getConfig();
  const base = { url, index: indexName };

  try {
    const client = getClient();

    // 1) 服务存活：/health 不需要鉴权
    const health = await withTimeout(client.health(), CHECK_TIMEOUT_MS, 'Meilisearch 存活检查');
    if (health?.status !== 'available') {
      return {
        healthy: false,
        message: `服务状态异常: ${health?.status ?? 'unknown'}`,
        ...base,
        latencyMs: Date.now() - startedAt,
      };
    }

    // 2) 鉴权 + 索引是否就绪：一次请求同时验证 API Key 和索引存在性
    const indexes = await withTimeout(
      client.getIndexes({ limit: 100 }),
      CHECK_TIMEOUT_MS,
      'Meilisearch 鉴权检查'
    );
    const indexExists = (indexes.results ?? []).some((item) => item.uid === indexName);

    return {
      healthy: true,
      message: indexExists
        ? 'Connected'
        : `Connected（索引 "${indexName}" 不存在，搜索需先建立索引）`,
      ...base,
      latencyMs: Date.now() - startedAt,
    };
  } catch (error) {
    const status = httpStatusOf(error);
    const message =
      status === 401 || status === 403
        ? `鉴权失败（HTTP ${status}），请检查 MEILI_MASTER_KEY`
        : `Error: ${toMessage(error)}`;

    console.error('[Health] Meilisearch 检查失败:', message);
    return { healthy: false, message, ...base, latencyMs: Date.now() - startedAt };
  }
}

export async function GET() {
  const [database, meilisearch] = await Promise.all([checkDatabase(), checkMeilisearch()]);

  const isHealthy = database.healthy && (meilisearch.healthy || !meilisearchRequired);

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: { database, meilisearch },
    },
    { status: isHealthy ? 200 : 503 }
  );
}
