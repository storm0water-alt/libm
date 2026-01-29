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
// Removed Accordion import - component doesn't exist
import { Loader2, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

interface CsvImportProgress {
  id: string;
  fileName: string;
  total: number;
  processed: number;
  failed: number;
  status: "pending" | "processing" | "completed" | "failed";
  errors?: Array<{ archiveNo: string; reason: string }>;
  createdAt: string;
  updatedAt: string;
}

interface CsvImportProgressProps {
  importRecordId: string | null;
  onComplete?: (result: CsvImportProgress) => void;
}

/**
 * CSV import progress component
 * Shows import progress and detailed error list
 */
export function CsvImportProgress({ importRecordId, onComplete }: CsvImportProgressProps) {
  const [progress, setProgress] = useState<CsvImportProgress | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProgress = async () => {
    if (!importRecordId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/import/csv/${importRecordId}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[CSV Import Progress] Failed:', response.status, errorText);
        throw new Error(`获取导入进度失败 (${response.status})`);
      }

      const data = await response.json();
      setProgress(data);

      // Check for completion
      if (data.status === 'completed') {
        onComplete?.(data);
      }
    } catch (error) {
      console.error('[CSV Import Progress] Failed to fetch:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!importRecordId) {
      setProgress(null);
      return;
    }

    fetchProgress();

    // Auto-refresh every 2 seconds
    const interval = setInterval(fetchProgress, 2000);
    return () => clearInterval(interval);
  }, [importRecordId]);

  const getStatusIcon = (status: CsvImportProgress["status"]) => {
    switch (status) {
      case "pending":
        return <Loader2 className="h-5 w-5 text-gray-500" />;
      case "processing":
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusBadge = (status: CsvImportProgress["status"]) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">等待中</Badge>;
      case "processing":
        return <Badge variant="default" className="bg-blue-500">处理中</Badge>;
      case "completed":
        return <Badge variant="default" className="bg-green-500">已完成</Badge>;
      case "failed":
        return <Badge variant="destructive">失败</Badge>;
    }
  };

  const getProgressPercent = () => {
    if (!progress || progress.total === 0) return 0;
    return Math.round((progress.processed / progress.total) * 100);
  };

  if (!importRecordId) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            请先选择 CSV 文件并开始导入
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!progress && loading) {
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

  if (!progress) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            未找到导入记录
          </div>
        </CardContent>
      </Card>
    );
  }

  const successCount = progress.processed - progress.failed;
  const progressPercent = getProgressPercent();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            <CardTitle className="text-lg">CSV 导入进度</CardTitle>
          </div>
          {getStatusBadge(progress.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* File Info */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          {getStatusIcon(progress.status)}
          <div className="flex-1">
            <div className="font-medium">{progress.fileName}</div>
            <div className="text-sm text-muted-foreground">
              开始时间: {new Date(progress.createdAt).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {progress.status === "processing" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">处理进度</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <div className="text-sm text-muted-foreground">
              已处理: {progress.processed} / {progress.total} 条记录
            </div>
          </div>
        )}

        {/* Summary Statistics */}
        {(progress.status === "completed" || progress.status === "failed") && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
              <div className="text-sm text-green-700 dark:text-green-400">成功更新</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{progress.failed}</div>
              <div className="text-sm text-red-700 dark:text-red-400">更新失败</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{progress.total}</div>
              <div className="text-sm text-muted-foreground">总记录数</div>
            </div>
          </div>
        )}

        {/* Error List */}
        {progress.failed > 0 && progress.errors && progress.errors.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-red-600">
              <AlertCircle className="h-4 w-4" />
              失败记录详情 ({progress.errors.length})
            </div>
            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">序号</TableHead>
                    <TableHead>档号</TableHead>
                    <TableHead>失败原因</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progress.errors.map((error, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-mono text-sm">{error.archiveNo}</TableCell>
                      <TableCell className="text-red-600">{error.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {progress.status === "completed" && (
          <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">导入完成</span>
            </div>
            <div className="text-sm text-green-600 dark:text-green-500">
              成功 {successCount} 条，失败 {progress.failed} 条
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
