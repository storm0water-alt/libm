"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SearchResults } from "@/components/search/search-results";
import { PdfPreviewById } from "@/components/pdf/pdf-preview-by-id";
import { Loader2, Search as SearchIcon } from "lucide-react";

interface Archive {
  id: string;
  archiveNo: string | null;
  title: string;
  deptIssue: string | null;
  responsible: string | null;
  docNo: string | null;
  remark: string | null;
  category: string | null;
  tags: string[];
  createdAt: Date;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface SearchResponse {
  results: Archive[];
  pagination: PaginationInfo;
  query: string;
  processingTimeMs: number;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q") || "";
  const pageParam = parseInt(searchParams.get("page") || "1");
  const categoryParam = searchParams.get("category") || undefined;
  const tagsParam = searchParams.get("tags")?.split(",").filter(Boolean) || undefined;

  const [query, setQuery] = useState(queryParam);
  const [results, setResults] = useState<Archive[]>([]);
  const [allResults, setAllResults] = useState<Archive[]>([]); // For filter options
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: pageParam,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [processingTimeMs, setProcessingTimeMs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<{
    category?: string;
    tags?: string[];
  }>({
    category: categoryParam,
    tags: tagsParam,
  });
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [pdfPreviewArchiveId, setPdfPreviewArchiveId] = useState<string | null>(null);

  // Load search history from localStorage on mount
  useEffect(() => {
    const history = localStorage.getItem("searchHistory");
    if (history) {
      try {
        setSearchHistory(JSON.parse(history));
      } catch (e) {
        console.error("Failed to parse search history:", e);
      }
    }
  }, []);

  // Save search to history
  const saveToHistory = (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setSearchHistory((prev) => {
      const newHistory = [searchQuery, ...prev.filter((q) => q !== searchQuery)].slice(0, 10);
      localStorage.setItem("searchHistory", JSON.stringify(newHistory));
      return newHistory;
    });
  };

  // Perform search when query, page, or filters change
  useEffect(() => {
    if (queryParam) {
      performSearch(queryParam, pageParam, activeFilters);
    }
  }, [queryParam, pageParam, activeFilters.category, activeFilters.tags]);

  const performSearch = async (
    searchQuery: string,
    page: number,
    filters: { category?: string; tags?: string[] }
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        q: searchQuery,
        page: page.toString(),
        limit: "20",
      });

      if (filters.category) {
        params.set("category", filters.category);
      }
      if (filters.tags && filters.tags.length > 0) {
        params.set("tags", filters.tags.join(","));
      }

      const response = await fetch(`/api/search?${params.toString()}`);

      if (!response.ok) {
        throw new Error("搜索失败");
      }

      const data: SearchResponse = await response.json();
      setResults(data.results);
      setPagination(data.pagination);
      setProcessingTimeMs(data.processingTimeMs);

      // Save to search history
      saveToHistory(searchQuery);

      // Update allResults when no filters are active (for filter options)
      if (!filters.category && (!filters.tags || filters.tags.length === 0)) {
        setAllResults(data.results);
      }
    } catch (err) {
      console.error("Search error:", err);
      setError(err instanceof Error ? err.message : "搜索失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    // Save to search history
    saveToHistory(query);

    const params = new URLSearchParams();
    params.set("q", query);
    if (activeFilters.category) {
      params.set("category", activeFilters.category);
    }
    if (activeFilters.tags && activeFilters.tags.length > 0) {
      params.set("tags", activeFilters.tags.join(","));
    }

    router.push(`/search?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", page.toString());
    router.push(`/search?${params.toString()}`);
  };

  const handleFilterChange = (filters: { category?: string; tags?: string[] }) => {
    setActiveFilters(filters);

    // Reset to page 1 when filters change
    const params = new URLSearchParams();
    params.set("q", queryParam);
    params.set("page", "1");

    if (filters.category) {
      params.set("category", filters.category);
    }
    if (filters.tags && filters.tags.length > 0) {
      params.set("tags", filters.tags.join(","));
    }

    router.push(`/search?${params.toString()}`);
  };

  const handleTitleClick = (archiveId: string) => {
    setPdfPreviewArchiveId(archiveId);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Search Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">档案搜索</h1>

        <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            type="text"
            placeholder="输入档号、题名、机构问题、责任者、文号等关键词..."
            className="h-14 text-lg px-6 pr-32"
            autoFocus
          />
          <Button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <SearchIcon className="h-5 w-5 mr-2" />
                搜索
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Error message */}
      {error && (
        <Card className="p-4 mb-6 border-red-200 bg-red-50">
          <p className="text-red-600">{error}</p>
        </Card>
      )}

      {/* View in Archives Management Button */}
      {queryParam && !loading && !error && results.length > 0 && (
        <Card className="p-4 mb-6 border-blue-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              找到 <span className="font-semibold">{pagination.total}</span> 个结果
              <span className="mx-2">•</span>
              耗时 <span className="font-semibold">{processingTimeMs}ms</span>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                const params = new URLSearchParams()
                params.set("q", queryParam)
                params.set("fromSearch", "true")
                // Pass filters if active
                if (activeFilters.category) {
                  params.set("category", activeFilters.category)
                }
                if (activeFilters.tags && activeFilters.tags.length > 0) {
                  params.set("tags", activeFilters.tags.join(","))
                }
                router.push(`/archives?${params.toString()}`)
              }}
            >
              在档案管理中查看
            </Button>
          </div>
        </Card>
      )}

      {/* Search Results */}
      {queryParam ? (
        loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">搜索中...</span>
          </div>
        ) : (
          <SearchResults
            results={results}
            allResults={allResults}
            query={queryParam}
            pagination={pagination}
            processingTimeMs={processingTimeMs}
            filters={activeFilters}
            onPageChange={handlePageChange}
            onFilterChange={handleFilterChange}
            onTitleClick={handleTitleClick}
          />
        )
      ) : (
        <WelcomeSection
          searchHistory={searchHistory}
          onHistoryClick={(query) => {
            setQuery(query);
            saveToHistory(query);
            router.push(`/search?q=${encodeURIComponent(query)}`);
          }}
          onClearHistory={() => {
            setSearchHistory([]);
            localStorage.removeItem("searchHistory");
          }}
        />
      )}

      {/* PDF Preview Dialog */}
      <PdfPreviewById
        open={!!pdfPreviewArchiveId}
        onOpenChange={(open) => {
          if (!open) setPdfPreviewArchiveId(null);
        }}
        archiveId={pdfPreviewArchiveId}
      />
    </div>
  );
}

function WelcomeSection({
  searchHistory,
  onHistoryClick,
  onClearHistory,
}: {
  searchHistory: string[];
  onHistoryClick: (query: string) => void;
  onClearHistory: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Search History */}
      {searchHistory.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">最近搜索</h2>
            <button
              onClick={onClearHistory}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              清空历史
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((query, index) => (
              <button
                key={index}
                onClick={() => onHistoryClick(query)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-gray-700 transition-colors flex items-center gap-2"
              >
                <span className="text-gray-400">🔍</span>
                <span>{query}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">快速操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/archives"
            className="flex items-center p-4 border rounded-md hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">📁</span>
            <div>
              <div className="font-medium">档案管理</div>
              <div className="text-sm text-gray-500">查看和管理所有档案</div>
            </div>
          </a>
          <a
            href="/import"
            className="flex items-center p-4 border rounded-md hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">📥</span>
            <div>
              <div className="font-medium">批量入库</div>
              <div className="text-sm text-gray-500">导入新档案</div>
            </div>
          </a>
          <a
            href="/logs"
            className="flex items-center p-4 border rounded-md hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">📋</span>
            <div>
              <div className="font-medium">操作日志</div>
              <div className="text-sm text-gray-500">查看系统操作记录</div>
            </div>
          </a>
          <a
            href="/dashboard"
            className="flex items-center p-4 border rounded-md hover:bg-gray-50 transition-colors"
          >
            <span className="text-2xl mr-3">📊</span>
            <div>
              <div className="font-medium">数据看板</div>
              <div className="text-sm text-gray-500">查看系统统计信息</div>
            </div>
          </a>
        </div>
      </Card>

      {/* Search Tips */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h2 className="text-lg font-semibold mb-3">💡 搜索提示</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>• 支持搜索档号、题名、机构问题、责任者、文号、备注等字段</li>
          <li>• 输入关键词后按回车或点击搜索按钮</li>
          <li>• 可以使用分类和标签筛选结果</li>
          <li>• 搜索结果会高亮显示匹配的文字</li>
        </ul>
      </Card>
    </div>
  );
}
