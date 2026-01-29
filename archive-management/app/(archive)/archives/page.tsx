"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, FileText, Loader2, AlertCircle, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArchiveTable } from "@/components/archive/archive-table";
import { ArchiveFormDialog } from "@/components/archive/archive-form-dialog";
import { PdfPreviewDialog } from "@/components/archive/pdf-preview-dialog";
import { DeleteConfirmDialog } from "@/components/archive/delete-confirm-dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { SearchResultsBanner } from "@/components/search/search-results-banner";
import { Pagination } from "@/components/ui/pagination";
import {
  queryArchivesAction,
  deleteArchiveAction,
  batchDeleteArchivesAction,
  getArchiveFiltersAction,
} from "@/app/(archive)/archives/actions";
import type { ArchiveItem } from "@/services/archive.service";
import { useLoading } from "@/lib/loading-context";

// Retention period options (enum)
const RETENTION_PERIODS = ["永久", "长期", "短期", "10年", "30年"];

export default function ArchivesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setLoading } = useLoading();
  const fromSearch = searchParams.get("fromSearch") === "true";
  const searchQuery = searchParams.get("q") || "";
  const initialSearchCategory = searchParams.get("category") || undefined;
  const initialSearchTags = searchParams.get("tags")?.split(",").filter(Boolean) || undefined;
  // Data state
  const [archives, setArchives] = useState<ArchiveItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // UI state
  const [loading, setPageLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(20);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Filter state - exact match text inputs
  const [archiveNo, setArchiveNo] = useState<string>("");
  const [fondsNo, setFondsNo] = useState<string>("");
  const [boxNo, setBoxNo] = useState<string>("");
  const [pieceNo, setPieceNo] = useState<string>("");

  // Filter state - keyword search
  // Initialize directly from URL params if coming from search page
  const initialSearchValue = (fromSearch && searchQuery) ? searchQuery : "";
  const [search, setSearch] = useState<string>(initialSearchValue);

  // Filter state - dropdowns
  const [year, setYear] = useState<string>("all");
  const [retentionPeriod, setRetentionPeriod] = useState<string>("all");
  const [responsible, setResponsible] = useState<string>("");

  // Filter state - date range
  const [dateRange, setDateRange] = useState<{ from?: string; to?: string }>({});

  // Search mode filters (from Meilisearch)
  const [searchCategory, setSearchCategory] = useState<string>();
  const [searchTags, setSearchTags] = useState<string[]>();

  // Filter options for dropdowns
  const [filterOptions, setFilterOptions] = useState<{
    years: string[];
    responsibles: string[];
  }>({
    years: [],
    responsibles: [],
  });

  // Dialogs state
  const [showCreateDialog, setShowCreateDialog] = useState<boolean>(false);
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [showPdfDialog, setShowPdfDialog] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [selectedArchive, setSelectedArchive] = useState<ArchiveItem | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  // Query trigger - increment to trigger query
  const [queryTrigger, setQueryTrigger] = useState<number>(0);

  // Search mode: initialize directly based on URL params to avoid double initialization
  const shouldUseSearchMode = fromSearch && !!searchQuery;
  const [useSearchMode, setUseSearchMode] = useState<boolean>(shouldUseSearchMode);

  // Flag to ensure initialization only happens once
  const [initialized, setInitialized] = useState<boolean>(false);

  // Load filter options on mount and handle search redirect
  useEffect(() => {
    if (initialized) return; // Prevent double initialization

    console.log("[Archives] useEffect - Initial state", { fromSearch, searchQuery, search, useSearchMode });

    loadFilterOptions();

    // If coming from search page, save search filters (search is already set in useState)
    if (fromSearch && searchQuery) {
      console.log("[Archives] Init from search page", { searchQuery, initialSearchCategory, initialSearchTags });
      // Save search filters
      if (initialSearchCategory) setSearchCategory(initialSearchCategory);
      if (initialSearchTags) setSearchTags(initialSearchTags);
    }

    // Trigger initial query
    setQueryTrigger(1);
    setInitialized(true);
  }, [initialized, fromSearch, searchQuery, initialSearchCategory, initialSearchTags]);

  // Load archives when queryTrigger or page changes
  useEffect(() => {
    loadArchives();
  }, [queryTrigger, page]);

  // Load filter options
  const loadFilterOptions = async () => {
    try {
      const result = await getArchiveFiltersAction();
      if (result.success && result.data) {
        // Get unique years and responsibles from existing archives
        // Filter out empty strings to avoid SelectItem errors
        setFilterOptions({
          years: (result.data.years || []).filter(y => y && y.trim() !== ""),
          responsibles: [], // Will be populated from actual data
        });
      }
    } catch (err) {
      console.error("Failed to load filter options:", err);
    }
  };

  // Load archives
  const loadArchives = async () => {
    setPageLoading(true);
    setError("");
    setSelectedIds([]);

    try {
      // If in search mode (from search page), use Meilisearch
      if (useSearchMode && search) {
        console.log("[Archives] Using Meilisearch mode", { search, searchCategory, searchTags, page });
        const params = new URLSearchParams({
          q: search,
          page: page.toString(),
          limit: pageSize.toString(),
        });

        // Add filters from search page
        if (searchCategory) {
          params.set("category", searchCategory);
        }
        if (searchTags && searchTags.length > 0) {
          params.set("tags", searchTags.join(","));
        }

        console.log("[Archives] Fetching from Meilisearch:", params.toString());
        const response = await fetch(`/api/search?${params.toString()}`);

        if (!response.ok) {
          throw new Error("搜索失败");
        }

        const data = await response.json();
        console.log("[Archives] Meilisearch response:", data.pagination.total, "results");

        // Meilisearch already returns Prisma Archive objects, cast directly to ArchiveItem
        const items: ArchiveItem[] = data.results as ArchiveItem[];

        setArchives(items);
        setTotal(data.pagination.total);
        setTotalPages(Math.ceil(data.pagination.total / pageSize));
      } else {
        // Normal mode: use PostgreSQL with filters
        console.log("[Archives] Using PostgreSQL mode", { search, archiveNo, fondsNo, boxNo, pieceNo, year, retentionPeriod, responsible, dateRange, page });
        const result = await queryArchivesAction({
          page,
          pageSize,
          search: search || undefined,
          archiveNo: archiveNo || undefined,
          fondsNo: fondsNo || undefined,
          boxNo: boxNo || undefined,
          pieceNo: pieceNo || undefined,
          year: year !== "all" ? year : undefined,
          retentionPeriod: retentionPeriod !== "all" ? retentionPeriod : undefined,
          responsible: responsible || undefined,
          dateStart: dateRange.from,
          dateEnd: dateRange.to,
        });

        if (result.success && result.data) {
          setArchives(result.data.items);
          setTotal(result.data.total);
          setTotalPages(result.data.totalPages);
        } else {
          setError(result.error || "加载档案失败");
        }
      }
    } catch (err) {
      console.error("Failed to load archives:", err);
      setError("加载档案失败，请重试");
    } finally {
      setPageLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    setPage(1);
    setUseSearchMode(false); // Switch to PostgreSQL mode when using filter search
    setQueryTrigger(prev => prev + 1);
  };

  // Handle filter reset
  const handleResetFilters = () => {
    setSearch("");
    setArchiveNo("");
    setFondsNo("");
    setBoxNo("");
    setPieceNo("");
    setYear("all");
    setRetentionPeriod("all");
    setResponsible("");
    setDateRange({});
    setPage(1);
    setUseSearchMode(false); // Exit search mode when resetting filters
    setSearchCategory(undefined); // Clear search filters
    setSearchTags([]); // Clear search filters
    setQueryTrigger(prev => prev + 1);
  };

  // Handle create
  const handleCreate = () => {
    setSelectedArchive(null);
    setShowCreateDialog(true);
  };

  // Handle edit
  const handleEdit = (archive: ArchiveItem) => {
    setSelectedArchive(archive);
    setShowEditDialog(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    const archive = archives.find(a => a.archiveID === id);
    setSelectedArchive(archive || null);
    setPendingDeleteIds([id]);
    setShowDeleteDialog(true);
  };

  // Handle batch delete
  const handleBatchDelete = async (ids: string[]) => {
    setPendingDeleteIds(ids);
    setShowDeleteDialog(true);
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    setLoading(true, pendingDeleteIds.length > 1 ? "正在批量删除..." : "正在删除...");
    try {
      let result;
      if (pendingDeleteIds.length === 1) {
        result = await deleteArchiveAction(pendingDeleteIds[0]);
      } else {
        result = await batchDeleteArchivesAction(pendingDeleteIds);
      }

      if (result.success) {
        // Reload archives
        await loadArchives();
        return { success: true };
      } else {
        return { success: false, error: result.error || "删除失败" };
      }
    } catch (err) {
      console.error("Failed to delete archive:", err);
      return { success: false, error: err instanceof Error ? err.message : "删除失败，请重试" };
    } finally {
      setLoading(false);
    }
  };

  // Handle view PDF
  const handleViewPdf = (archive: ArchiveItem) => {
    setSelectedArchive(archive);
    setShowPdfDialog(true);
  };

  // Handle form dialog success
  const handleFormSuccess = () => {
    setShowCreateDialog(false);
    setShowEditDialog(false);
    setSelectedArchive(null);
    loadArchives();
    // Reload filter options in case new values were added
    loadFilterOptions();
  };

  // Check if any filter is active
  const hasActiveFilters =
    search ||
    archiveNo ||
    fondsNo ||
    boxNo ||
    pieceNo ||
    year !== "all" ||
    retentionPeriod !== "all" ||
    responsible ||
    dateRange.from ||
    dateRange.to;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            档案管理
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            共 {total} 个档案
          </p>
        </div>
      </div>

      {/* Search Results Banner */}
      {useSearchMode && search && (
        <SearchResultsBanner
          query={search}
          total={total}
          category={searchCategory}
          tags={searchTags}
        />
      )}

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters - only show in PostgreSQL mode */}
      {!useSearchMode && (
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Title search bar (keyword search in title) */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="查询题名..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch();
                    }
                  }}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleSearch}>查询</Button>
              <Button
                variant="outline"
                onClick={handleResetFilters}
                disabled={!hasActiveFilters}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                重置
              </Button>
            </div>

            {/* Exact match filters - Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Archive No - exact match */}
              <div className="space-y-2">
                <Label htmlFor="archiveNo">档号</Label>
                <Input
                  id="archiveNo"
                  placeholder="精确匹配档号"
                  value={archiveNo}
                  onChange={(e) => setArchiveNo(e.target.value)}
                />
              </div>

              {/* Fonds No - exact match */}
              <div className="space-y-2">
                <Label htmlFor="fondsNo">全宗号</Label>
                <Input
                  id="fondsNo"
                  placeholder="精确匹配全宗号"
                  value={fondsNo}
                  onChange={(e) => setFondsNo(e.target.value)}
                />
              </div>

              {/* Box No - exact match */}
              <div className="space-y-2">
                <Label htmlFor="boxNo">盒号</Label>
                <Input
                  id="boxNo"
                  placeholder="精确匹配盒号"
                  value={boxNo}
                  onChange={(e) => setBoxNo(e.target.value)}
                />
              </div>

              {/* Piece No - exact match */}
              <div className="space-y-2">
                <Label htmlFor="pieceNo">件号</Label>
                <Input
                  id="pieceNo"
                  placeholder="精确匹配件号"
                  value={pieceNo}
                  onChange={(e) => setPieceNo(e.target.value)}
                />
              </div>
            </div>

            {/* Dropdown filters - Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Year - dropdown */}
              <div className="space-y-2">
                <Label htmlFor="year">年度</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger id="year">
                    <SelectValue placeholder="全部年度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部年度</SelectItem>
                    {filterOptions.years.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Retention Period - enum dropdown */}
              <div className="space-y-2">
                <Label htmlFor="retentionPeriod">保管期限</Label>
                <Select value={retentionPeriod} onValueChange={setRetentionPeriod}>
                  <SelectTrigger id="retentionPeriod">
                    <SelectValue placeholder="全部期限" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部期限</SelectItem>
                    {RETENTION_PERIODS.map((period) => (
                      <SelectItem key={period} value={period}>
                        {period}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Responsible - keyword search dropdown */}
              <div className="space-y-2">
                <Label htmlFor="responsible">责任者</Label>
                <Input
                  id="responsible"
                  placeholder="责任者关键词"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                />
              </div>

              {/* Date Range - Range Picker */}
              <div className="space-y-2">
                <Label>日期范围</Label>
                <DateRangePicker
                  value={dateRange}
                  onChange={setDateRange}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Search mode info - only show in Meilisearch mode */}
      {useSearchMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <svg
                  className="h-5 w-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">当前使用全文搜索模式</h3>
                <p className="text-sm text-gray-600 mb-2">
                  您正在使用 Meilisearch 全文搜索引擎查看结果。
                </p>
                {(searchCategory || (searchTags && searchTags.length > 0)) && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm text-gray-600">当前筛选：</span>
                    {searchCategory && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                        分类: {searchCategory}
                      </span>
                    )}
                    {searchTags && searchTags.map((tag) => (
                      <span key={tag} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetFilters}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    切换到筛选模式
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Archives Table */}
      {loading ? (
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                <p className="text-sm text-gray-500">加载中...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ArchiveTable
          archives={archives}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onView={handleViewPdf}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onBatchDelete={handleBatchDelete}
          onDownload={() => {}}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      )}

      {/* Create Dialog */}
      <ArchiveFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={handleFormSuccess}
      />

      {/* Edit Dialog */}
      <ArchiveFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={handleFormSuccess}
        archive={selectedArchive}
      />

      {/* PDF Preview Dialog */}
      <PdfPreviewDialog
        open={showPdfDialog}
        onOpenChange={setShowPdfDialog}
        archive={selectedArchive}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleConfirmDelete}
        itemName={selectedArchive?.title}
        isBatch={pendingDeleteIds.length > 1}
        itemCount={pendingDeleteIds.length}
      />
    </div>
  );
}
