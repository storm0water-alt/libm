// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "../route";

// 认证与搜索服务都 mock 掉，只测路由本身的行为
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/services/meilisearch.service", () => ({ searchArchives: vi.fn() }));

import { auth } from "@/auth";
import { searchArchives } from "@/services/meilisearch.service";

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;
const mockSearch = searchArchives as unknown as ReturnType<typeof vi.fn>;

function login(userId = "user-1") {
  mockAuth.mockResolvedValue({ user: { id: userId, username: "tester", role: "admin" } });
}

function searchResult(overrides: Record<string, unknown> = {}) {
  return {
    results: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    query: "测试",
    processingTimeMs: 1,
    ...overrides,
  };
}

async function callRoute(url: string) {
  const response = await GET(new Request(`http://localhost:3000${url}`));
  return { status: response.status, body: await response.json() };
}

describe("GET /api/search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    login();
    mockSearch.mockResolvedValue(searchResult());
  });

  it("返回搜索结果与分页信息", async () => {
    mockSearch.mockResolvedValue(
      searchResult({
        results: [{ archiveID: "a1", title: "测试档案" }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        processingTimeMs: 5,
      })
    );

    const { status, body } = await callRoute("/api/search?q=测试");

    expect(status).toBe(200);
    expect(body.results).toHaveLength(1);
    expect(body.pagination.total).toBe(1);
    expect(body.processingTimeMs).toBe(5);
    expect(mockSearch).toHaveBeenCalledWith("测试", {
      limit: 20,
      offset: 0,
      filters: {
        fondsNo: undefined,
        retentionPeriod: undefined,
        year: undefined,
        deptCode: undefined,
      },
    });
  });

  it("未登录返回 401", async () => {
    mockAuth.mockResolvedValue(null);

    const { status, body } = await callRoute("/api/search?q=测试");

    expect(status).toBe(401);
    expect(body.error).toBe("未授权");
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("缺少 q 返回 400", async () => {
    const { status, body } = await callRoute("/api/search");

    expect(status).toBe(400);
    expect(body.error).toBe("请求参数无效");
    expect(body.details.length).toBeGreaterThan(0);
    expect(mockSearch).not.toHaveBeenCalled();
  });

  it("limit 超出上限返回 400", async () => {
    const { status, body } = await callRoute("/api/search?q=测试&limit=101");

    expect(status).toBe(400);
    expect(body.details.some((d: { path: (string | number)[] }) => d.path.includes("limit"))).toBe(true);
  });

  it("page 小于 1 返回 400", async () => {
    const { status, body } = await callRoute("/api/search?q=测试&page=0");

    expect(status).toBe(400);
    expect(body.details.some((d: { path: (string | number)[] }) => d.path.includes("page"))).toBe(true);
  });

  it("把结构化筛选参数透传给搜索服务", async () => {
    const { status } = await callRoute(
      "/api/search?q=测试&fondsNo=A01&year=2024&retentionPeriod=永久&deptCode=D01"
    );

    expect(status).toBe(200);
    expect(mockSearch).toHaveBeenCalledWith("测试", {
      limit: 20,
      offset: 0,
      filters: {
        fondsNo: "A01",
        year: "2024",
        retentionPeriod: "永久",
        deptCode: "D01",
      },
    });
  });

  it("按 page/limit 计算 offset", async () => {
    await callRoute("/api/search?q=测试&page=3&limit=25");

    expect(mockSearch).toHaveBeenCalledWith("测试", {
      limit: 25,
      offset: 50,
      filters: expect.any(Object),
    });
  });

  it("搜索服务异常返回 500", async () => {
    mockSearch.mockRejectedValue(new Error("meilisearch down"));

    const { status, body } = await callRoute("/api/search?q=测试");

    expect(status).toBe(500);
    expect(body.error).toBe("搜索失败，请稍后重试");
  });

  it("查询串中的特殊字符被正确解码后交给服务", async () => {
    await callRoute("/api/search?q=test%20%26%20special");

    expect(mockSearch).toHaveBeenCalledWith("test & special", expect.any(Object));
  });

  it("同一用户超过每分钟 100 次返回 429", async () => {
    login("rate-limit-user");

    for (let i = 0; i < 100; i++) {
      const { status } = await callRoute("/api/search?q=测试");
      expect(status).toBe(200);
    }

    const { status, body } = await callRoute("/api/search?q=测试");

    expect(status).toBe(429);
    expect(body.error).toContain("过于频繁");
  });
});
