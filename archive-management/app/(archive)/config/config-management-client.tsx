"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ConfigTable } from "@/components/config/config-table";
import { ConfigFormDialog } from "@/components/config/config-form-dialog";
import { ExportImportDialog } from "@/components/config/export-import-dialog";
import { HistoryDialog } from "@/components/config/history-dialog";
import { queryConfigsAction } from "./actions";
import { Settings, Download, Upload, Plus } from "lucide-react";

interface ConfigItem {
  id: string;
  configKey: string;
  configValue: string;
  configType: string;
  description: string | null;
  group: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ConfigListResponse {
  items: ConfigItem[];
  total: number;
  totalPages: number;
  currentPage: number;
}

interface ConfigManagementClientProps {
  initialConfigs: ConfigListResponse | null;
  initialGroups: string[];
  initialPage: number;
  initialGroup?: string;
  initialSearch?: string;
}

export function ConfigManagementClient({
  initialConfigs,
  initialGroups,
  initialPage,
  initialGroup,
  initialSearch,
}: ConfigManagementClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State
  const [configs, setConfigs] = useState<ConfigListResponse | null>(initialConfigs);
  const [groups] = useState<string[]>(initialGroups);
  const [selectedGroup, setSelectedGroup] = useState<string>(initialGroup || "");
  const [searchQuery, setSearchQuery] = useState<string>(initialSearch || "");
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<ConfigItem | null>(null);
  const [exportImportDialogOpen, setExportImportDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [historyConfigKey, setHistoryConfigKey] = useState<string>("");

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedGroup) params.set("group", selectedGroup);
    if (searchQuery) params.set("search", searchQuery);
    if (currentPage > 1) params.set("page", currentPage.toString());

    const queryString = params.toString();
    router.push(queryString ? `/config?${queryString}` : "/config");
  }, [selectedGroup, searchQuery, currentPage, router]);

  // Fetch configs when filters change
  useEffect(() => {
    const fetchConfigs = async () => {
      setLoading(true);
      setError("");

      try {
        const result = await queryConfigsAction({
          page: currentPage,
          pageSize: 20,
          group: selectedGroup || undefined,
          search: searchQuery || undefined,
        });

        if (result.success) {
          setConfigs(result.data as ConfigListResponse);
        } else {
          setError(result.error || "加载配置失败");
        }
      } catch (err) {
        console.error("Failed to fetch configs:", err);
        setError("加载配置失败");
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, [currentPage, selectedGroup, searchQuery]);

  // Handle create config
  const handleCreateConfig = async () => {
    // Refresh configs after creation
    const result = await queryConfigsAction({
      page: currentPage,
      pageSize: 20,
      group: selectedGroup || undefined,
      search: searchQuery || undefined,
    });

    if (result.success) {
      setConfigs(result.data as ConfigListResponse);
    }

    setCreateDialogOpen(false);
  };

  // Handle edit config
  const handleEditConfig = (config: ConfigItem) => {
    setEditConfig(config);
    setEditDialogOpen(true);
  };

  const handleUpdateConfig = async () => {
    // Refresh configs after update
    const result = await queryConfigsAction({
      page: currentPage,
      pageSize: 20,
      group: selectedGroup || undefined,
      search: searchQuery || undefined,
    });

    if (result.success) {
      setConfigs(result.data as ConfigListResponse);
    }

    setEditDialogOpen(false);
    setEditConfig(null);
  };

  // Handle delete config
  const handleDeleteConfig = async (configKey: string) => {
    if (!confirm("确定要删除这个配置吗？")) return;

    try {
      const response = await fetch("/api/config", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ configKey }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh configs
        const queryResult = await queryConfigsAction({
          page: currentPage,
          pageSize: 20,
          group: selectedGroup || undefined,
          search: searchQuery || undefined,
        });

        if (queryResult.success) {
          setConfigs(queryResult.data as ConfigListResponse);
        }
      } else {
        setError(result.error || "删除配置失败");
      }
    } catch (err) {
      console.error("Failed to delete config:", err);
      setError("删除配置失败");
    }
  };

  // Handle view history
  const handleViewHistory = (configKey: string) => {
    setHistoryConfigKey(configKey);
    setHistoryDialogOpen(true);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  // Handle group filter change
  const handleGroupChange = (value: string) => {
    setSelectedGroup(value === "all" ? "" : value);
    setCurrentPage(1);
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  return (
    <>
      {/* Action Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Search and Filter */}
            <div className="flex flex-1 gap-2">
              <Input
                placeholder="搜索配置键或描述..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="max-w-sm"
              />

              <Select value={selectedGroup || "all"} onValueChange={handleGroupChange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择分组" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分组</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportImportDialogOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                导入
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExportImportDialogOpen(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                导出
              </Button>
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                新增配置
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Config Table */}
      {!loading && configs && (
        <ConfigTable
          configs={configs.items}
          onEdit={handleEditConfig}
          onDelete={handleDeleteConfig}
          onViewHistory={handleViewHistory}
          total={configs.total}
          currentPage={configs.currentPage}
          totalPages={configs.totalPages}
          onPageChange={handlePageChange}
        />
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-gray-500">加载中...</div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && configs && configs.items.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12 text-gray-500">
              <Settings className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-lg font-medium">暂无配置</p>
              <p className="text-sm mt-2">
                {selectedGroup || searchQuery
                  ? "未找到匹配的配置"
                  : '点击"新增配置"按钮创建第一个配置'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Config Dialog */}
      <ConfigFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateConfig}
        groups={groups}
      />

      {/* Edit Config Dialog */}
      <ConfigFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleUpdateConfig}
        groups={groups}
        config={editConfig}
      />

      {/* Export/Import Dialog */}
      <ExportImportDialog
        open={exportImportDialogOpen}
        onOpenChange={setExportImportDialogOpen}
      />

      {/* History Dialog */}
      <HistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        configKey={historyConfigKey}
      />
    </>
  );
}
