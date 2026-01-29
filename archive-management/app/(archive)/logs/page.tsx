"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/logs/stats-cards";
import { FilterForm, FilterState } from "@/components/logs/filter-form";
import { LogsTable } from "@/components/logs/logs-table";
import { ExportDialog } from "@/components/logs/export-dialog";
import { getLogStats, exportLogs } from "./actions";
import { LogQueryParams } from "@/services/log.service";
import { Download } from "lucide-react";

interface LogStats {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  operationDistribution: Record<string, number>;
}

export default function LogsPage() {
  const [stats, setStats] = useState<LogStats | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  // Build query params from filters - memoized to prevent infinite loops
  const queryParams = useMemo((): LogQueryParams => {
    return {
      page: 1,
      pageSize: 20,
      filters: {
        operation: filters.operation,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        operator: filters.operator,
      },
      sortBy: "time",
      sortOrder: "desc",
    };
  }, [filters.operation, filters.startDate, filters.endDate, filters.operator]);

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await getLogStats();
      setStats(data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
  };

  const handleFilterReset = () => {
    setFilters({});
  };

  const handleOperationClick = (operation: string) => {
    setFilters({ ...filters, operation });
  };

  const handleExport = async (params: LogQueryParams) => {
    return exportLogs(params);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">操作日志</h1>
          <p className="text-sm text-gray-600 mt-1">
            查看系统所有操作记录
          </p>
        </div>
        <Button onClick={() => setExportDialogOpen(true)}>
          <Download className="mr-2 h-4 w-4" />
          导出日志
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <StatsCards stats={stats} onFilterClick={handleOperationClick} />
      )}

      {/* Filter Form */}
      <FilterForm
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleFilterReset}
      />

      {/* Logs Table */}
      <LogsTable initialParams={queryParams} />

      {/* Export Dialog */}
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        currentFilters={queryParams.filters}
        onExport={handleExport}
      />
    </div>
  );
}
