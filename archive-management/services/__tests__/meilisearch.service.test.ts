import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  searchArchives,
  indexArchive,
  deleteArchive,
  batchIndexArchives,
  configureIndexSettings,
  getSearchStats,
} from "../meilisearch.service";
import { prisma } from "@/lib/prisma";

// Mock Prisma
vi.mock "@/lib/prisma", () => ({
  prisma: {
    archive: {
      findMany: vi.fn(),
    },
  },
}));

// Mock Meilisearch client
const mockIndex = {
  search: vi.fn(),
  addDocuments: vi.fn(),
  updateDocuments: vi.fn(),
  deleteDocument: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getStats: vi.fn(),
};

const mockClient = {
  index: vi.fn(() => mockIndex),
};

vi.mock("meilisearch", () => ({
  default: vi.fn(() => mockClient),
}));

describe("Meilisearch Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("searchArchives", () => {
    it("should search archives successfully", async () => {
      const mockHits = [
        {
          id: "1",
          title: "Test Archive",
          archiveNo: "2024-TEST-001",
        },
      ];

      mockIndex.search.mockResolvedValue({
        hits: mockHits,
        estimatedTotalHits: 1,
        processingTimeMs: 5,
      });

      (prisma.archive.findMany as any).mockResolvedValue([
        {
          id: "1",
          title: "Test Archive",
          archiveNo: "2024-TEST-001",
          deptIssue: null,
          responsible: null,
          docNo: null,
          remark: null,
          category: null,
          tags: [],
          createdAt: new Date(),
        },
      ]);

      const result = await searchArchives("test", { limit: 20, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].title).toBe("Test Archive");
      expect(mockIndex.search).toHaveBeenCalledWith("test", {
        limit: 20,
        offset: 0,
        filter: undefined,
      });
    });

    it("should apply category filter", async () => {
      mockIndex.search.mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 2,
      });

      await searchArchives("test", {
        limit: 20,
        offset: 0,
        category: "Finance",
      });

      expect(mockIndex.search).toHaveBeenCalledWith("test", {
        limit: 20,
        offset: 0,
        filter: ['category = "Finance"'],
      });
    });

    it("should apply tag filters", async () => {
      mockIndex.search.mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 2,
      });

      await searchArchives("test", {
        limit: 20,
        offset: 0,
        tags: ["urgent", "important"],
      });

      expect(mockIndex.search).toHaveBeenCalledWith("test", {
        limit: 20,
        offset: 0,
        filter: ['tags = "urgent" OR tags = "important"'],
      });
    });

    it("should fallback to Prisma on Meilisearch error", async () => {
      mockIndex.search.mockRejectedValue(new Error("Meilisearch down"));

      (prisma.archive.findMany as any).mockResolvedValue([]);

      const result = await searchArchives("test", { limit: 20, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
      expect(prisma.archive.findMany).toHaveBeenCalled();
    });

    it("should handle empty query", async () => {
      mockIndex.search.mockResolvedValue({
        hits: [],
        estimatedTotalHits: 0,
        processingTimeMs: 2,
      });

      const result = await searchArchives("", { limit: 20, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.results).toEqual([]);
    });
  });

  describe("indexArchive", () => {
    it("should index archive successfully", async () => {
      mockIndex.updateDocuments.mockResolvedValue({
        status: "succeeded",
      });

      const archive = {
        id: "1",
        title: "Test",
        archiveNo: "2024-TEST-001",
        deptIssue: "Test Dept",
        responsible: "Test User",
        docNo: "TEST-001",
        remark: "Test remark",
        category: "Test Category",
        tags: ["tag1", "tag2"],
        year: 2024,
        createdAt: new Date(),
      };

      const result = await indexArchive(archive);

      expect(result.success).toBe(true);
      expect(mockIndex.updateDocuments).toHaveBeenCalledWith([
        {
          id: archive.id,
          title: archive.title,
          archiveNo: archive.archiveNo,
          docNo: archive.docNo,
          deptIssue: archive.deptIssue,
          responsible: archive.responsible,
          remark: archive.remark,
          category: archive.category,
          tags: archive.tags,
          year: archive.year,
        },
      ]);
    });

    it("should retry on transient failure", async () => {
      let attempts = 0;
      mockIndex.updateDocuments.mockImplementation(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Temporary error");
        }
        return { status: "succeeded" };
      });

      const archive = {
        id: "1",
        title: "Test",
        archiveNo: "2024-TEST-001",
        deptIssue: null,
        responsible: null,
        docNo: null,
        remark: null,
        category: null,
        tags: [],
        year: 2024,
        createdAt: new Date(),
      };

      const result = await indexArchive(archive);

      expect(result.success).toBe(true);
      expect(attempts).toBe(3);
    });

    it("should fail after max retries", async () => {
      mockIndex.updateDocuments.mockRejectedValue(
        new Error("Permanent error")
      );

      const archive = {
        id: "1",
        title: "Test",
        archiveNo: "2024-TEST-001",
        deptIssue: null,
        responsible: null,
        docNo: null,
        remark: null,
        category: null,
        tags: [],
        year: 2024,
        createdAt: new Date(),
      };

      const result = await indexArchive(archive);

      expect(result.success).toBe(false);
    });
  });

  describe("deleteArchive", () => {
    it("should delete archive from index", async () => {
      mockIndex.deleteDocument.mockResolvedValue({
        status: "succeeded",
      });

      const result = await deleteArchive("archive-1");

      expect(result.success).toBe(true);
      expect(mockIndex.deleteDocument).toHaveBeenCalledWith("archive-1");
    });

    it("should handle non-existent document gracefully", async () => {
      mockIndex.deleteDocument.mockResolvedValue({
        status: "succeeded",
      });

      const result = await deleteArchive("non-existent");

      expect(result.success).toBe(true);
    });
  });

  describe("batchIndexArchives", () => {
    it("should batch index archives in groups of 100", async () => {
      mockIndex.updateDocuments.mockResolvedValue({
        status: "succeeded",
      });

      const archives = Array.from({ length: 250 }, (_, i) => ({
        id: `archive-${i}`,
        title: `Archive ${i}`,
        archiveNo: `2024-TEST-${i.toString().padStart(3, "0")}`,
        deptIssue: null,
        responsible: null,
        docNo: null,
        remark: null,
        category: null,
        tags: [],
        year: 2024,
        createdAt: new Date(),
      }));

      const result = await batchIndexArchives(archives);

      expect(result.success).toBe(true);
      expect(result.indexed).toBe(250);
      expect(result.failed).toBe(0);
      expect(mockIndex.updateDocuments).toHaveBeenCalledTimes(3);
    });

    it("should handle partial failures", async () => {
      let callCount = 0;
      mockIndex.updateDocuments.mockImplementation(async () => {
        callCount++;
        if (callCount === 2) {
          throw new Error("Batch failed");
        }
        return { status: "succeeded" };
      });

      const archives = Array.from({ length: 150 }, (_, i) => ({
        id: `archive-${i}`,
        title: `Archive ${i}`,
        archiveNo: `2024-TEST-${i.toString().padStart(3, "0")}`,
        deptIssue: null,
        responsible: null,
        docNo: null,
        remark: null,
        category: null,
        tags: [],
        year: 2024,
        createdAt: new Date(),
      }));

      const result = await batchIndexArchives(archives);

      expect(result.success).toBe(false);
      expect(result.indexed).toBe(100);
      expect(result.failed).toBe(50);
    });
  });

  describe("configureIndexSettings", () => {
    it("should configure index settings", async () => {
      mockIndex.getSettings.mockResolvedValue({});
      mockIndex.updateSettings.mockResolvedValue({
        status: "succeeded",
        taskUid: 1,
      });

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
        ],
        filterableAttributes: ["category", "tags", "status", "year"],
        sortableAttributes: ["createdAt", "title"],
        rankingRules: [
          "words",
          "typo",
          "proximity",
          "attribute",
          "sort",
          "exactness",
        ],
        typoTolerance: {
          enabled: true,
          minWordSizeForTypos: {
            oneTypo: 4,
            twoTypos: 8,
          },
        },
      });
    });

    it("should return error if configuration fails", async () => {
      mockIndex.getSettings.mockResolvedValue({});
      mockIndex.updateSettings.mockRejectedValue(new Error("Config failed"));

      const result = await configureIndexSettings();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe("getSearchStats", () => {
    it("should return search stats", async () => {
      const mockStats = {
        numberOfDocuments: 1000,
        isIndexing: false,
        fieldDistribution: {
          title: 1000,
          archiveNo: 1000,
        },
      };

      mockIndex.getStats.mockResolvedValue(mockStats);

      const stats = await getSearchStats();

      expect(stats).toEqual({
        numberOfDocuments: 1000,
        isIndexing: false,
        fieldDistribution: mockStats.fieldDistribution,
      });
    });

    it("should return null on error", async () => {
      mockIndex.getStats.mockRejectedValue(new Error("Stats failed"));

      const stats = await getSearchStats();

      expect(stats).toBeNull();
    });
  });
});
