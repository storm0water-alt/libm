"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, X, CheckCircle2, XCircle, Clock, AlertCircle, SkipForward } from "lucide-react";
import { getActiveImportsAction, cancelImportAction } from "@/app/(archive)/import/actions";
import type { ImportRecordWithProgress } from "@/services/import.service";
import { toast } from "sonner";

interface ProgressListProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  onComplete?: (record: ImportRecordWithProgress) => void;
}

/**
 * Progress list component for displaying import progress
 * Auto-refreshes to show real-time progress updates
 */
export function ProgressList({
  autoRefresh = true,
  refreshInterval = 2000,
  onComplete,
}: ProgressListProps) {
  const [records, setRecords] = useState<ImportRecordWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = async () => {
    try {
      const result = await getActiveImportsAction();

      if (result.success && result.data) {
        const activeRecords = result.data;

        // Check for completed records
        const previousIds = new Set(records.map((r) => r.id));
        activeRecords.forEach((record) => {
          if (previousIds.has(record.id) && record.status === "completed") {
            onComplete?.(record);
          }
        });

        setRecords(activeRecords);
      }
    } catch (error) {
      console.error("Failed to fetch progress:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();

    if (autoRefresh) {
      const interval = setInterval(fetchProgress, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const handleCancel = async (recordId: string) => {
    try {
      const result = await cancelImportAction(recordId);

      if (result.success) {
        toast.success("入库任务已取消");
        await fetchProgress();
      } else {
        toast.error(result.error || "取消失败");
      }
    } catch (error) {
      toast.error("取消失败");
    }
  };

  const getStatusIcon = (status: ImportRecordWithProgress["status"]) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-gray-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-500" />;
      case "skipped":
        return <SkipForward className="h-4 w-4 text-yellow-500" />;
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
        return <Badge variant="secondary">已取消</Badge>;
      case "skipped":
        return <Badge variant="default" className="bg-yellow-500">已跳过</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (records.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            暂无进行中的入库任务
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>入库进度 ({records.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {records.map((record) => (
            <div key={record.id} className="border rounded-lg p-4 space-y-3">
              {/* File Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(record.status)}
                  <div>
                    <div className="font-medium">{record.fileName}</div>
                    <div className="text-sm text-muted-foreground">
                      操作人: {record.operator} • {new Date(record.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(record.status)}
                  {(record.status === "pending" || record.status === "processing") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancel(record.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              {record.status === "processing" && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">处理进度</span>
                    <span className="font-medium">{record.progress}%</span>
                  </div>
                  <Progress value={record.progress} className="h-2" />
                </div>
              )}

              {/* Skipped Message */}
              {record.status === "skipped" && (
                <div className="flex items-center gap-2 text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                  <SkipForward className="h-4 w-4" />
                  <span>档号已存在，跳过此文件</span>
                </div>
              )}

              {/* Error Message */}
              {record.status === "failed" && record.error && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                  <AlertCircle className="h-4 w-4" />
                  <span>{record.error}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
