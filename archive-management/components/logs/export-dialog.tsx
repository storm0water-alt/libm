"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogQueryParams } from "@/services/log.service";

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: LogQueryParams["filters"];
  onExport: (params: LogQueryParams) => Promise<void>;
}

export function ExportDialog({
  open,
  onOpenChange,
  currentFilters,
  onExport,
}: ExportDialogProps) {
  const [operation, setOperation] = useState<string>(currentFilters.operation || "all");
  const [startDate, setStartDate] = useState<string>(
    currentFilters.startDate?.toISOString().split("T")[0] || ""
  );
  const [endDate, setEndDate] = useState<string>(
    currentFilters.endDate?.toISOString().split("T")[0] || ""
  );
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);

    try {
      const params: LogQueryParams = {
        page: 1,
        pageSize: 10000,
        filters: {
          operation: operation === "all" ? undefined : operation,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
        },
      };

      await onExport(params);

      // Download the CSV file
      const queryParams = new URLSearchParams();

      if (params.filters.operation) {
        queryParams.set("operation", params.filters.operation);
      }

      if (params.filters.startDate) {
        queryParams.set("startDate", params.filters.startDate.toISOString());
      }

      if (params.filters.endDate) {
        queryParams.set("endDate", params.filters.endDate.toISOString());
      }

      const response = await fetch(`/api/logs/export?${queryParams.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to export logs");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      onOpenChange(false);
    } catch (error) {
      console.error("Failed to export logs:", error);
      alert("导出失败，请重试");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>导出操作日志</DialogTitle>
          <DialogDescription>
            导出当前筛选条件下的操作日志为 CSV 文件
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="export-operation">操作类型</Label>
            <Select
              value={operation}
              onValueChange={setOperation}
            >
              <SelectTrigger id="export-operation">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="delete">删除</SelectItem>
                <SelectItem value="modify">修改</SelectItem>
                <SelectItem value="download">下载</SelectItem>
                <SelectItem value="import">入库</SelectItem>
                <SelectItem value="create">创建</SelectItem>
                <SelectItem value="view">查看</SelectItem>
                <SelectItem value="login">登录</SelectItem>
                <SelectItem value="logout">登出</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-startDate">开始日期</Label>
            <Input
              id="export-startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="export-endDate">结束日期</Label>
            <Input
              id="export-endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={exporting}
          >
            取消
          </Button>
          <Button onClick={handleExport} disabled={exporting}>
            {exporting ? "导出中..." : "导出"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
