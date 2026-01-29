"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";
import { queryImportHistoryAction } from "@/app/(archive)/import/actions";
import type { ImportRecordWithProgress } from "@/services/import.service";
import { Pagination } from "@/components/ui/pagination";

interface HistoryTableProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * History table component for displaying import history records
 * Supports pagination, filtering, and auto-refresh
 */
export function HistoryTable({ autoRefresh = false, refreshInterval = 10000 }: HistoryTableProps) {
  const [records, setRecords] = useState<ImportRecordWithProgress[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [operatorFilter, setOperatorFilter] = useState<string>("");

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const result = await queryImportHistoryAction({
        page,
        pageSize,
        status: statusFilter !== "all" ? statusFilter : undefined,
        operator: operatorFilter || undefined,
      });

      if (result.success && result.data) {
        setRecords(result.data.items);
        setTotal(result.data.total);
        setTotalPages(result.data.totalPages);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [page, statusFilter, operatorFilter]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHistory, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, page, statusFilter, operatorFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const getStatusBadge = (status: ImportRecordWithProgress["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">等待中</Badge>;
      case "processing":
        return <Badge variant="default" className="bg-blue-500">处理中</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500">已完成</Badge>;
      case "failed":
        return <Badge variant="destructive">失败</Badge>;
      case "cancelled":
        return <Badge variant="outline">已取消</Badge>;
      case "skipped":
        return <Badge variant="default" className="bg-yellow-500">已跳过</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>入库历史</CardTitle>
          <div className="flex items-center gap-2">
            <Input
              placeholder="操作人"
              value={operatorFilter}
              onChange={(e) => {
                setOperatorFilter(e.target.value);
                setPage(1);
              }}
              className="w-40"
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">等待中</SelectItem>
                <SelectItem value="processing">处理中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="failed">失败</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
                <SelectItem value="skipped">已跳过</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Records Table */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              暂无入库记录
            </div>
          ) : (
            <>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>文件名</TableHead>
                      <TableHead className="w-[100px]">状态</TableHead>
                      <TableHead className="w-[100px]">进度</TableHead>
                      <TableHead>操作人</TableHead>
                      <TableHead>创建时间</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.fileName}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                        <TableCell>{record.progress}%</TableCell>
                        <TableCell>{record.operator}</TableCell>
                        <TableCell>{formatDate(record.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                total={total}
                pageSize={pageSize}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
