"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OperationBadge } from "./operation-badge";
import { queryLogs } from "@/app/(archive)/logs/actions";
import { LogQueryParams } from "@/services/log.service";
import { Pagination } from "@/components/ui/pagination";

interface Log {
  id: string;
  operator: string;
  operation: string;
  target: string;
  ip: string;
  time: string;
  archive?: {
    archiveID: string;
    archiveNo: string | null;
    title: string;
  } | null;
}

interface LogsTableProps {
  initialParams: LogQueryParams;
}

export function LogsTable({ initialParams }: LogsTableProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const pageSize = 20;

  // Memoize params to prevent infinite loop
  const params = useMemo(() => ({
    ...initialParams,
    page,
    pageSize,
  }), [initialParams.filters, initialParams.sortBy, initialParams.sortOrder, page]);

  const fetchLogs = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const result = await queryLogs(params);
      setLogs(result.data || []);
      setTotal(result.total || 0);
    } catch (error) {
      console.error("[CLIENT] Failed to fetch logs:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [params]);

  // Fetch logs whenever params change (including page changes)
  useEffect(() => {
    fetchLogs();
  }, [params]); // Fetch when params changes (includes page)

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchLogs(true);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]); // Only depend on autoRefresh

  const handleRefresh = () => {
    fetchLogs(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>日志列表</CardTitle>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              共 {total} 条记录
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? "刷新中..." : "刷新"}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">自动刷新:</span>
              <Button
                size="sm"
                variant={autoRefresh ? "default" : "outline"}
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? "ON" : "OFF"}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12 text-gray-500">加载中...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无操作日志
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>时间</TableHead>
                  <TableHead>操作人</TableHead>
                  <TableHead>操作类型</TableHead>
                  <TableHead>目标对象</TableHead>
                  <TableHead>IP地址</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.time).toLocaleString("zh-CN", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>{log.operator}</TableCell>
                    <TableCell>
                      <OperationBadge operation={log.operation} />
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {log.target}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.ip}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalPages={Math.ceil(total / pageSize)}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
