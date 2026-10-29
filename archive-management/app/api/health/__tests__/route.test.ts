// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock 依赖：数据库与 Meilisearch 客户端
vi.mock("@/lib/prisma", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

vi.mock("@/lib/meilisearch", () => ({
  getClient: vi.fn(),
  getConfig: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getClient, getConfig } from "@/lib/meilisearch";

const mockQueryRaw = prisma.$queryRaw as unknown as ReturnType<typeof vi.fn>;
const mockGetClient = getClient as unknown as ReturnType<typeof vi.fn>;
const mockGetConfig = getConfig as unknown as ReturnType<typeof vi.fn>;

/** 构造一个「正常」的 Meilisearch 客户端 */
function healthyMeiliClient() {
  return {
    health: vi.fn().mockResolvedValue({ status: "available" }),
    getIndexes: vi.fn().mockResolvedValue({ results: [{ uid: "archives" }] }),
  };
}

/** 每个用例重置模块，让 route 重新读取 process.env */
async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

async function callHealth() {
  const { GET } = await loadRoute();
  const response = await GET();
  return { status: response.status, body: await response.json() };
}

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("HEALTH_REQUIRE_MEILISEARCH", "true");
    vi.stubEnv("HEALTH_CHECK_TIMEOUT_MS", "200");
    mockQueryRaw.mockResolvedValue([{ "?column?": 1 }]);
    mockGetConfig.mockReturnValue({
      url: "http://localhost:7700",
      apiKey: "test-key",
      indexName: "archives",
    });
    mockGetClient.mockReturnValue(healthyMeiliClient());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("数据库与 Meilisearch 都正常时返回 200 / healthy", async () => {
    const { status, body } = await callHealth();

    expect(status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.services.database).toMatchObject({ healthy: true, message: "Connected" });
    expect(body.services.meilisearch).toMatchObject({
      healthy: true,
      message: "Connected",
      url: "http://localhost:7700",
      index: "archives",
    });
  });

  it("数据库异常时返回 503 / unhealthy 并带上错误信息", async () => {
    mockQueryRaw.mockRejectedValue(new Error("connection refused"));

    const { status, body } = await callHealth();

    expect(status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.services.database.healthy).toBe(false);
    expect(body.services.database.message).toContain("connection refused");
  });

  it("Meilisearch 不可用时返回 503（默认视为必需依赖）", async () => {
    mockGetClient.mockReturnValue({
      health: vi.fn().mockRejectedValue(new Error("Request to http://localhost:7700/health has failed")),
      getIndexes: vi.fn(),
    });

    const { status, body } = await callHealth();

    expect(status).toBe(503);
    expect(body.status).toBe("unhealthy");
    expect(body.services.meilisearch.healthy).toBe(false);
    expect(body.services.meilisearch.message).toContain("has failed");
  });

  it("MEILI_MASTER_KEY 无效（HTTP 401）时给出鉴权提示", async () => {
    const error = Object.assign(new Error("Unauthorized"), {
      response: { status: 401 },
    });
    mockGetClient.mockReturnValue({
      health: vi.fn().mockResolvedValue({ status: "available" }),
      getIndexes: vi.fn().mockRejectedValue(error),
    });

    const { status, body } = await callHealth();

    expect(status).toBe(503);
    expect(body.services.meilisearch.healthy).toBe(false);
    expect(body.services.meilisearch.message).toContain("MEILI_MASTER_KEY");
  });

  it("索引不存在时仍视为健康，但给出提示", async () => {
    mockGetClient.mockReturnValue({
      health: vi.fn().mockResolvedValue({ status: "available" }),
      getIndexes: vi.fn().mockResolvedValue({ results: [] }),
    });

    const { status, body } = await callHealth();

    expect(status).toBe(200);
    expect(body.services.meilisearch.healthy).toBe(true);
    expect(body.services.meilisearch.message).toContain("archives");
    expect(body.services.meilisearch.message).toContain("不存在");
  });

  it("HEALTH_REQUIRE_MEILISEARCH=false 时 Meilisearch 异常不拉低整体状态", async () => {
    vi.stubEnv("HEALTH_REQUIRE_MEILISEARCH", "false");
    mockGetClient.mockReturnValue({
      health: vi.fn().mockRejectedValue(new Error("down")),
      getIndexes: vi.fn(),
    });

    const { status, body } = await callHealth();

    expect(status).toBe(200);
    expect(body.status).toBe("healthy");
    expect(body.services.meilisearch.healthy).toBe(false);
  });

  it("依赖无响应时按超时失败，不会挂住健康检查", async () => {
    mockQueryRaw.mockReturnValue(new Promise(() => {})); // 永不 resolve

    const { status, body } = await callHealth();

    expect(status).toBe(503);
    expect(body.services.database.healthy).toBe(false);
    expect(body.services.database.message).toContain("超时");
  });
});
