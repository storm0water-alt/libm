"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Settings, Edit, Trash2, History, Lock } from "lucide-react";

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

interface ConfigTableProps {
  configs: ConfigItem[];
  onEdit: (config: ConfigItem) => void;
  onDelete: (configKey: string) => void;
  onViewHistory: (configKey: string) => void;
  total: number;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function ConfigTable({
  configs,
  onEdit,
  onDelete,
  onViewHistory,
  total,
  currentPage,
  totalPages,
  onPageChange,
}: ConfigTableProps) {
  // Group configs by group name
  const groupedConfigs = configs.reduce<
    Record<string, ConfigItem[]>
  >((acc, config) => {
    if (!acc[config.group]) {
      acc[config.group] = [];
    }
    acc[config.group].push(config);
    return acc;
  }, {});

  // Get all unique groups, sorted
  const groups = Object.keys(groupedConfigs).sort();

  // Get badge variant for config type
  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "string":
        return "default";
      case "number":
        return "secondary";
      case "boolean":
        return "outline";
      case "json":
        return "destructive";
      default:
        return "default";
    }
  };

  // Get display name for config type
  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case "string":
        return "字符串";
      case "number":
        return "数字";
      case "boolean":
        return "布尔值";
      case "json":
        return "JSON";
      default:
        return type;
    }
  };

  // Format config value for display
  const formatConfigValue = (config: ConfigItem) => {
    const { configValue, configType } = config;

    switch (configType) {
      case "boolean":
        return configValue === "true" ? "是" : "否";
      case "json":
        try {
          const parsed = JSON.parse(configValue);
          if (typeof parsed === "object") {
            return `[${Object.keys(parsed).length} 个字段]`;
          }
          return configValue;
        } catch {
          return configValue;
        }
      default:
        // Truncate long values
        if (configValue.length > 50) {
          return `${configValue.substring(0, 50)}...`;
        }
        return configValue;
    }
  };

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <Card key={group}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              分组: {group}
              <Badge variant="secondary" className="ml-2">
                {groupedConfigs[group].length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">配置键</TableHead>
                  <TableHead className="w-[150px]">配置值</TableHead>
                  <TableHead className="w-[100px]">类型</TableHead>
                  <TableHead>描述</TableHead>
                  <TableHead className="w-[120px]">更新时间</TableHead>
                  <TableHead className="text-right w-[180px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedConfigs[group].map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          {config.configKey}
                        </span>
                        {config.isSystem && (
                          <Lock
                            className="h-3 w-3 text-gray-400"
                            title="系统保留配置"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-gray-600">
                        {formatConfigValue(config)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(config.configType)}>
                        {getTypeDisplayName(config.configType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {config.description || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {new Date(config.updatedAt).toLocaleDateString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => onViewHistory(config.configKey)}
                          title="查看历史"
                        >
                          <History className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => onEdit(config)}
                          title="编辑"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        {!config.isSystem && (
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            onClick={() => onDelete(config.configKey)}
                            title="删除"
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                显示 {(currentPage - 1) * 20 + 1} -{" "}
                {Math.min(currentPage * 20, total)} / {total}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => onPageChange(currentPage - 1)}
                >
                  上一页
                </Button>
                <div className="flex items-center px-3">
                  <span className="text-sm">
                    第 {currentPage} / {totalPages} 页
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => onPageChange(currentPage + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
