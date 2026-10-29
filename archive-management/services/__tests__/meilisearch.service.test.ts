// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchArchives,
  indexArchive,
  deleteArchive,
  batchIndexArchives,
  configureIndexSettings,
  getSearchStats,
  type ArchiveDocumentSource,
} from "../meilisearch.service";
import { prisma } from "@/lib/prisma";

// Meilisearch 客户端与健康检查（服务通过 @/lib/meilisearch 访问）
const { mockIndex, mockCheckHealth } = vi.hoisted(() => ({
  mockIndex: {
    search: vi.fn(),
    updateDocuments: vi.fn(),
    deleteDocument: vi.fn(),
    updateSettings: vi.fn(),
    getStats: vi.fn(),
  },
  mockCheckHealth: vi.fn(),
}));

vi.mock("@/lib/meilisearch", () => ({
  getIndex: vi.fn(async () => mockIndex),
  checkHealth: mockCheckHealth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { archive: { findMany: vi.fn(), count: vi.fn() } },
}));

const mockFindMany = prisma.archive.findMany as unknown as ReturnType<typeof vi.fn>;
const mockCount = prisma.archive.count as unknown as ReturnType<typeof vi.fn>;

/** 构造一条符合当前 Archive 模型的测试数据 */
function makeArchive(overrides: Partial<ArchiveDocumentSource> = {}): ArchiveDocumentSource {
  return {
    archiveID: "clx0000000000000000000001",
    archiveNo: "A01-2024-001",
    fondsNo: "A01",
    retentionPeriod: "永久",
    year: "2024",
    deptCode: "D01",
    title: "测试档案",
    deptIssue: "综合处",
    responsible: "张三",
    docNo: "A01-2024-001",
    remark: null,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

/** 服务里 archiveToDocument 的期望产物 */
function expectedDocument(archive: ArchiveDocumentSource) {
  return {
    id: archive.archiveID,
    archiveNo: archive.archiveNo,
    title: archive.title,
    deptIssue: archive.deptIssue,
    responsible: archive.responsible,
    docNo: archive.docNo,
    remark: archive.remark,
    fondsNo: archive.fondsNo,
    retentionPeriod: archive.retentionPeriod,
    year: archive.year,
    deptCode: archive.deptCode,
    createdAt: archive.createdAt.toISOString(),
  };
}

describe("Meilisearch Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckHealth.mockResolvedValue({ healthy: true });
    mockCount.mockResolvedValue(0);
    mockFindMany.mockResolvedValue([]);
  });

  describe("searchArchives（走 Meilisearch）", () => {
    it("命中后按 Meilisearch 顺序回填数据库详情", async () => {
      mockIndex.search.mockResolvedValue({
        hits: [{ id: "a1" }, { id: "a2" }],
        estimatedTotalHits: 2,
        processingTimeMs: 5,
      });
      mockFindMany.mockResolvedValue([
        makeArchive({ archiveID: "a2", title: "第二条" }),
        makeArchive({ archiveID: "a1", title: "第一条" }),
      ]);

      const result = await searchArchives("测试", { limit: 20, offset: 0 });

      expect(mockIndex.search).toHaveBeenCalledWith("测试", { limit: 20, offset: 0 });
      expect(result.results.map((a) => a.archiveID)).toEqual(["a1", "a2"]);
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 2, totalPages: 1 });
      expect(result.query).toBe("测试");
      expect(result.processingTimeMs).toBe(5);
    });

    it("无筛选条件时不传 filter", async () => {
      mockIndex.search.mockResolvedValue({ hits: [], estimatedTotalHits: 0, processingTimeMs: 1 });

      await searchArchives("测试", { limit: 10, offset: 10 });

      expect(mockIndex.search).toHaveBeenCalledWith("测试", { limit: 10, offset: 10 });
      expect(mockIndex.search.mock.calls[0][1]).not.toHaveProperty("filter");
    });

    it("把业务筛选条件转成 Meilisearch filter 表达式", async () => {
      mockIndex.search.mockResolvedValue({ hits: [], estimatedTotalHits: 0, processingTimeMs: 1 });

      await searchArchives("测试", {
        limit: 20,
        offset: 0,
        filters: { fondsNo: "A01", year: "2024", retentionPeriod: "", deptCode: undefined },
      });

      expect(mockIndex.search).toHaveBeenCalledWith("测试", {
        limit: 20,
        offset: 0,
        filter: ['fondsNo = "A01"', 'year = "2024"'],
      });
    });

    it("空查询也能正常返回", async () => {
      mockIndex.search.mockResolvedValue({ hits: [], estimatedTotalHits: 0, processingTimeMs: 1 });

      const result = await searchArchives("", { limit: 20, offset: 0 });

      expect(mockIndex.search).toHaveBeenCalledWith("", { limit: 20, offset: 0 });
      expect(result.results).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });
  });

  describe("searchArchives（降级到 Prisma）", () => {
    it("Meilisearch 不健康时降级查询数据库", async () => {
      mockCheckHealth.mockResolvedValue({ healthy: false, error: "down" });
      mockFindMany.mockResolvedValue([makeArchive({ title: "降级结果" })]);
      mockCount.mockResolvedValue(1);

      const result = await searchArchives("测试", { limit: 20, offset: 0 });

      expect(mockIndex.search).not.toHaveBeenCalled();
      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe("降级结果");
      expect(result.pagination.total).toBe(1);
    });

    it("降级时同样应用筛选条件", async () => {
      mockCheckHealth.mockResolvedValue({ healthy: false });

      await searchArchives("测试", { limit: 20, offset: 0, filters: { year: "2024", deptCode: "D01" } });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).toMatchObject({ year: "2024", deptCode: "D01" });
      expect(where.OR).toBeDefined();
      // count 与 findMany 使用同一 where
      expect(mockCount.mock.calls[0][0].where).toEqual(where);
    });

    it("检索报错时降级查询数据库", async () => {
      mockIndex.search.mockRejectedValue(new Error("index unavailable"));
      mockFindMany.mockResolvedValue([makeArchive()]);
      mockCount.mockResolvedValue(1);

      const result = await searchArchives("测试", { limit: 20, offset: 0 });

      expect(result.results).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalled();
    });
  });

  describe("indexArchive", () => {
    it("把 Archive 转成索引文档后写入", async () => {
      mockIndex.updateDocuments.mockResolvedValue({ status: "succeeded" });
      const archive = makeArchive();

      const result = await indexArchive(archive);

      expect(result.success).toBe(true);
      expect(mockIndex.updateDocuments).toHaveBeenCalledWith([expectedDocument(archive)]);
    });

    it("临时失败会重试并最终成功", async () => {
      let attempts = 0;
      mockIndex.updateDocuments.mockImplementation(async () => {
        attempts++;
        if (attempts < 3) throw new Error("temporary");
        return { status: "succeeded" };
      });

      const result = await indexArchive(makeArchive());

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });

    it("超过最大重试次数后返回失败与错误信息", async () => {
      mockIndex.updateDocuments.mockRejectedValue(new Error("permanent"));

      const result = await indexArchive(makeArchive());

      expect(result.success).toBe(false);
      expect(result.error).toContain("permanent");
      expect(mockIndex.updateDocuments).toHaveBeenCalledTimes(3);
    });
  });

  describe("deleteArchive", () => {
    it("删除指定文档", async () => {
      mockIndex.deleteDocument.mockResolvedValue({ status: "succeeded" });

      const result = await deleteArchive("a1");

      expect(result.success).toBe(true);
      expect(mockIndex.deleteDocument).toHaveBeenCalledWith("a1");
    });

    it("删除失败时返回错误信息", async () => {
      mockIndex.deleteDocument.mockRejectedValue(new Error("not found"));

      const result = await deleteArchive("missing");

      expect(result.success).toBe(false);
      expect(result.error).toBe("not found");
    });
  });

  describe("batchIndexArchives", () => {
    it("按每批 100 条分批写入", async () => {
      mockIndex.updateDocuments.mockResolvedValue({ status: "succeeded" });
      const archives = Array.from({ length: 250 }, (_, i) =>
        makeArchive({ archiveID: `a${i}`, archiveNo: `A01-2024-${i}` })
      );

      const result = await batchIndexArchives(archives);

      expect(result).toEqual({ success: true, indexed: 250, failed: 0, errors: [] });
      expect(mockIndex.updateDocuments).toHaveBeenCalledTimes(3);
      expect(mockIndex.updateDocuments.mock.calls[0][0]).toHaveLength(100);
      expect(mockIndex.updateDocuments.mock.calls[2][0]).toHaveLength(50);
    });

    it("部分批次失败时统计成功与失败数量", async () => {
      let call = 0;
      mockIndex.updateDocuments.mockImplementation(async () => {
        call++;
        if (call === 2) throw new Error("batch failed");
        return { status: "succeeded" };
      });
      const archives = Array.from({ length: 150 }, (_, i) => makeArchive({ archiveID: `a${i}` }));

      const result = await batchIndexArchives(archives);

      expect(result.success).toBe(false);
      expect(result.indexed).toBe(100);
      expect(result.failed).toBe(50);
      expect(result.errors[0]).toContain("batch failed");
    });
  });

  describe("configureIndexSettings", () => {
    it("下发与当前模型一致的索引设置", async () => {
      mockIndex.updateSettings.mockResolvedValue({ status: "succeeded", taskUid: 1 });

      const result = await configureIndexSettings();

      expect(result.success).toBe(true);
      expect(mockIndex.updateSettings).toHaveBeenCalledWith({
        searchableAttributes: [
          "title",
          "archiveNo",
          "docNo",
          "deptIssue",
          "responsible",
          "remark",
          "fondsNo",
          "retentionPeriod",
        ],
        filterableAttributes: ["fondsNo", "retentionPeriod", "year", "deptCode"],
        sortableAttributes: ["createdAt", "title"],
        rankingRules: ["words", "typo", "proximity", "attribute", "sort", "exactness"],
        displayedAttributes: ["*"],
        typoTolerance: {
          enabled: true,
          minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 },
        },
        stopWords: [],
        synonyms: {},
      });
    });

    it("配置下发失败时返回错误", async () => {
      mockIndex.updateSettings.mockRejectedValue(new Error("config failed"));

      const result = await configureIndexSettings();

      expect(result.success).toBe(false);
      expect(result.error).toContain("config failed");
    });

    it("searchArchives 用到的筛选字段必须都是 filterable，否则筛选会失效", async () => {
      mockIndex.updateSettings.mockResolvedValue({ status: "succeeded" });

      await configureIndexSettings();
      const settings = mockIndex.updateSettings.mock.calls[0][0];

      expect(settings.filterableAttributes).toEqual(
        expect.arrayContaining(["fondsNo", "retentionPeriod", "year", "deptCode"])
      );
    });
  });

  describe("getSearchStats", () => {
    it("返回文档数与索引状态", async () => {
      mockIndex.getStats.mockResolvedValue({
        numberOfDocuments: 1000,
        isIndexing: false,
        fieldDistribution: { title: 1000, archiveNo: 1000 },
      });

      const stats = await getSearchStats();

      expect(stats).toMatchObject({
        numberOfDocuments: 1000,
        isIndexing: false,
        fieldDistribution: { title: 1000, archiveNo: 1000 },
      });
      expect(typeof stats?.lastUpdate).toBe("string");
    });

    it("出错时返回 null", async () => {
      mockIndex.getStats.mockRejectedValue(new Error("stats failed"));

      await expect(getSearchStats()).resolves.toBeNull();
    });
  });
});
