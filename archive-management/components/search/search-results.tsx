"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchHighlight } from "./search-highlight";
import { ChevronLeft, ChevronRight, X, Filter } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Archive {
  archiveID: string;
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

interface SearchResultsProps {
  results: Archive[];
  allResults?: Archive[]; // All results (for filter options)
  query: string;
  pagination: PaginationInfo;
  processingTimeMs: number;
  filters?: {
    category?: string;
    tags?: string[];
  };
  onPageChange: (page: number) => void;
  onFilterChange?: (filters: { category?: string; tags?: string[] }) => void;
  onTitleClick?: (archiveId: string) => void;
}

/**
 * Display search results with highlighting and pagination
 */
export function SearchResults({
  results,
  allResults = results,
  query,
  pagination,
  processingTimeMs,
  filters,
  onPageChange,
  onFilterChange,
  onTitleClick,
}: SearchResultsProps) {
  // Extract unique categories and tags from all results
  const { uniqueCategories, uniqueTags } = useMemo(() => {
    const categories = new Set<string>();
    const tags = new Set<string>();

    allResults.forEach((archive) => {
      if (archive.category) {
        categories.add(archive.category);
      }
      if (archive.tags) {
        archive.tags.forEach((tag) => tags.add(tag));
      }
    });

    return {
      uniqueCategories: Array.from(categories).sort(),
      uniqueTags: Array.from(tags).sort(),
    };
  }, [allResults]);

  // Handle tag toggle
  const handleTagToggle = (tag: string) => {
    const currentTags = filters?.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];

    onFilterChange?.({ ...filters, tags: newTags.length > 0 ? newTags : undefined });
  };

  // Clear all filters
  const clearFilters = () => {
    onFilterChange?.({});
  };

  // Get active filter count
  const activeFilterCount =
    (filters?.category ? 1 : 0) + (filters?.tags?.length || 0);
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          未找到相关档案
        </h3>
        <p className="text-gray-600 mb-4">
          没有找到与 "<strong>{query}</strong>" 匹配的档案
        </p>
        <div className="text-sm text-gray-500 space-y-1">
          <p>建议：</p>
          <ul className="list-disc list-inside">
            <li>检查输入的拼写是否正确</li>
            <li>尝试使用其他关键词</li>
            <li>使用更通用的搜索词</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Section */}
      {(uniqueCategories.length > 0 || uniqueTags.length > 0) && (
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                筛选条件
                {activeFilterCount > 0 && (
                  <Badge variant="secondary">{activeFilterCount}</Badge>
                )}
              </CardTitle>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  清除筛选
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Filter */}
            {uniqueCategories.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  分类
                </label>
                <Select
                  value={filters?.category || "all"}
                  onValueChange={(value) => {
                    onFilterChange?.({
                      ...filters,
                      category: value === "all" ? undefined : value,
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    {uniqueCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Tags Filter */}
            {uniqueTags.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  标签
                </label>
                <div className="flex flex-wrap gap-2">
                  {uniqueTags.slice(0, 20).map((tag) => {
                    const isSelected = filters?.tags?.includes(tag);
                    return (
                      <Badge
                        key={tag}
                        variant={isSelected ? "default" : "outline"}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? "bg-purple-600 hover:bg-purple-700"
                            : "hover:bg-purple-100 hover:border-purple-300"
                        }`}
                        onClick={() => handleTagToggle(tag)}
                      >
                        {tag}
                        {isSelected && <X className="h-3 w-3 ml-1" />}
                      </Badge>
                    );
                  })}
                  {uniqueTags.length > 20 && (
                    <Badge variant="outline" className="text-gray-500">
                      +{uniqueTags.length - 20} 更多
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="text-sm text-gray-600">
          找到 <span className="font-semibold">{pagination.total}</span> 个结果
          <span className="mx-2">•</span>
          耗时 <span className="font-semibold">{processingTimeMs}ms</span>
        </div>

        {/* Active filters */}
        {(filters?.category || (filters?.tags && filters.tags.length > 0)) && (
          <div className="flex items-center gap-2">
            {filters.category && (
              <Badge variant="secondary" className="flex items-center gap-1">
                分类: {filters.category}
                <button
                  onClick={() =>
                    onFilterChange?.({ ...filters, category: undefined })
                  }
                  className="ml-1 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            )}
            {filters.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                标签: {tag}
                <button
                  onClick={() =>
                    onFilterChange?.({
                      ...filters,
                      tags: filters.tags?.filter((t) => t !== tag),
                    })
                  }
                  className="ml-1 hover:text-red-500"
                >
                  ×
                </button>
              </Badge>
            ))}
            {(filters.category || (filters.tags && filters.tags.length > 0)) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFilterChange?.({})}
                className="text-xs"
              >
                清除筛选
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Results list */}
      <div className="space-y-4">
        {results.map((archive) => (
          <Card key={archive.archiveID} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle
                    className="text-lg text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                    onClick={() => onTitleClick?.(archive.archiveID)}
                  >
                    <SearchHighlight text={archive.title} query={query} />
                  </CardTitle>

                  <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600">
                    {archive.archiveNo && (
                      <span>
                        档号: <strong>{archive.archiveNo}</strong>
                      </span>
                    )}
                    {archive.responsible && (
                      <>
                        <span>•</span>
                        <span>责任者: {archive.responsible}</span>
                      </>
                    )}
                    {archive.docNo && (
                      <>
                        <span>•</span>
                        <span>文号: {archive.docNo}</span>
                      </>
                    )}
                  </div>
                </div>

                {archive.category && (
                  <Badge variant="outline">{archive.category}</Badge>
                )}
              </div>
            </CardHeader>

            <CardContent>
              {archive.deptIssue && (
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-medium">机构问题：</span>
                  <SearchHighlight text={archive.deptIssue} query={query} />
                </p>
              )}

              {archive.remark && (
                <p className="text-sm text-gray-600">
                  <SearchHighlight text={archive.remark} query={query} maxLength={200} />
                </p>
              )}

              {archive.tags && archive.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {archive.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            上一页
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
              let pageNum;
              if (pagination.totalPages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.totalPages - 2) {
                pageNum = pagination.totalPages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }

              return (
                <Button
                  key={`page-${pageNum}-${i}`}
                  variant={pagination.page === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(pageNum)}
                  className="min-w-[2.5rem]"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
          >
            下一页
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Page info */}
      <div className="text-center text-sm text-gray-600">
        第 {pagination.page} / {pagination.totalPages} 页
      </div>
    </div>
  );
}
