import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET } from "../route";

// Mock Meilisearch service
vi.mock("@/services/meilisearch.service", () => ({
  searchArchives: vi.fn(),
}));

// Mock auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { searchArchives } from "@/services/meilisearch.service";
import { auth } from "@/auth";

describe("Search API Route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("Request", class Request {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("GET /api/search", () => {
    it("should return search results for valid query", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "1", username: "test" },
      });

      (searchArchives as any).mockResolvedValue({
        success: true,
        results: [
          {
            id: "1",
            title: "Test Archive",
            archiveNo: "2024-TEST-001",
            deptIssue: "Test Dept",
            responsible: "Test User",
            docNo: "TEST-001",
            remark: "Test remark",
            category: "Test",
            tags: ["tag1"],
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
        processingTimeMs: 5,
      });

      const request = new Request("http://localhost:3000/api/search?q=test");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toHaveLength(1);
      expect(data.results[0].title).toBe("Test Archive");
      expect(data.pagination.total).toBe(1);
      expect(data.processingTimeMs).toBe(5);
    });

    it("should validate query parameter", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "1", username: "test" },
      });

      const request = new Request("http://localhost:3000/api/search");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it("should validate limit parameter", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "1", username: "test" },
      });

      const request = new Request(
        "http://localhost:3000/api/search?q=test&limit=101"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("limit");
    });

    it("should validate page parameter", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "1", username: "test" },
      });

      const request = new Request("http://localhost:3000/api/search?q=test&page=0");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("page");
    });

    it("should apply category filter", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "1", username: "test" },
      });

      (searchArchives as any).mockResolvedValue({
        success: true,
        results: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
        processingTimeMs: 2,
      });

      const request = new Request(
        "http://localhost:3000/api/search?q=test&category=Finance"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(searchArchives).toHaveBeenCalledWith("test", {
        limit: 20,
        offset: 0,
        category: "Finance",
      });
    });

    it("should apply tag filters", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "1", username: "test" },
      });

      (searchArchives as any).mockResolvedValue({
        success: true,
        results: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
        processingTimeMs: 2,
      });

      const request = new Request(
        "http://localhost:3000/api/search?q=test&tags=urgent,important"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(searchArchives).toHaveBeenCalledWith("test", {
        limit: 20,
        offset: 0,
        tags: ["urgent", "important"],
      });
    });

    it("should handle pagination correctly", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "1", username: "test" },
      });

      (searchArchives as any).mockResolvedValue({
        success: true,
        results: [],
        pagination: {
          page: 2,
          limit: 20,
          total: 50,
          totalPages: 3,
        },
        processingTimeMs: 3,
      });

      const request = new Request(
        "http://localhost:3000/api/search?q=test&page=2&limit=20"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination.page).toBe(2);
      expect(searchArchives).toHaveBeenCalledWith("test", {
        limit: 20,
        offset: 20,
      });
    });

    it("should return 401 for unauthenticated requests", async () => {
      (auth as any).mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/search?q=test");
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it("should handle Meilisearch errors gracefully", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "1", username: "test" },
      });

      (searchArchives as any).mockResolvedValue({
        success: false,
        error: "Meilisearch connection failed",
      });

      const request = new Request("http://localhost:3000/api/search?q=test");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });

    it("should handle empty results", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "1", username: "test" },
      });

      (searchArchives as any).mockResolvedValue({
        success: true,
        results: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
        processingTimeMs: 1,
      });

      const request = new Request("http://localhost:3000/api/search?q=nonexistent");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toEqual([]);
      expect(data.pagination.total).toBe(0);
    });

    it("should escape special characters in query", async () => {
      (auth as any).mockResolvedValue({
        user: { id: "1", username: "test" },
      });

      (searchArchives as any).mockResolvedValue({
        success: true,
        results: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
        processingTimeMs: 1,
      });

      const request = new Request(
        "http://localhost:3000/api/search?q=test%20%26%20special"
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(searchArchives).toHaveBeenCalledWith("test & special", {
        limit: 20,
        offset: 0,
      });
    });
  });
});
