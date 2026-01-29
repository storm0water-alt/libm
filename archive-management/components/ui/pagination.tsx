"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

/**
 * Enhanced pagination component with first/last page navigation
 */
export function Pagination({
  currentPage,
  totalPages,
  total,
  pageSize,
  onPageChange,
}: PaginationProps) {
  // Calculate display info
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, total);

  // Handle jump to page
  const handleJumpToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  if (total <= pageSize) {
    return null; // Don't show pagination if only one page
  }

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Display info */}
      <div className="text-sm text-muted-foreground flex-1">
        显示 {startIndex} - {endIndex} / 共 {total} 条
      </div>

      {/* Pagination controls */}
      <div className="flex items-center gap-2">
        {/* First page button */}
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage === 1}
          onClick={() => handleJumpToPage(1)}
          title="首页"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* Previous page button */}
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage === 1}
          onClick={() => handleJumpToPage(currentPage - 1)}
          title="上一页"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Page info */}
        <div className="flex items-center gap-2">
          <span className="text-sm">
            第
            <Input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (page >= 1 && page <= totalPages) {
                  onPageChange(page);
                }
              }}
              className="w-16 h-8 text-center"
            />
            / {totalPages} 页
          </span>
        </div>

        {/* Next page button */}
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage === totalPages}
          onClick={() => handleJumpToPage(currentPage + 1)}
          title="下一页"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Last page button */}
        <Button
          size="sm"
          variant="outline"
          disabled={currentPage === totalPages}
          onClick={() => handleJumpToPage(totalPages)}
          title="尾页"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
