"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getConfigHistoryAction } from "@/app/(archive)/config/actions";
import { History, Clock, User, ArrowRight } from "lucide-react";

interface HistoryRecord {
  id: string;
  configKey: string;
  oldValue: string;
  newValue: string;
  operator: string;
  createdAt: Date;
}

interface HistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  configKey: string;
}

export function HistoryDialog({
  open,
  onOpenChange,
  configKey,
}: HistoryDialogProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch history when dialog opens
  useEffect(() => {
    if (open && configKey) {
      fetchHistory();
    }
  }, [open, configKey]);

  const fetchHistory = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getConfigHistoryAction(configKey);

      if (result.success) {
        setHistory(result.data as HistoryRecord[]);
      } else {
        setError(result.error || "加载历史记录失败");
      }
    } catch (err) {
      console.error("Failed to fetch config history:", err);
      setError("加载历史记录失败");
    } finally {
      setLoading(false);
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  // Truncate long values
  const truncateValue = (value: string, maxLength: number = 100) => {
    if (value.length <= maxLength) return value;
    return `${value.substring(0, maxLength)}...`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            配置变更历史
          </DialogTitle>
          <DialogDescription>
            配置键: <span className="font-mono font-medium">{configKey}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">加载中...</p>
              </div>
            </div>
          ) : error ? (
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <p className="text-destructive text-sm text-center">{error}</p>
              </CardContent>
            </Card>
          ) : history.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-gray-500">
                  <History className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-medium">暂无修改历史</p>
                  <p className="text-sm mt-2">该配置从未被修改过</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((record, index) => (
                <Card
                  key={record.id}
                  className={index === 0 ? "border-primary" : ""}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-4">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            index === 0 ? "bg-primary" : "bg-gray-300"
                          }`}
                        />
                        {index < history.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-1" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 space-y-3">
                        {/* Header */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <Badge
                            variant={index === 0 ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {index === 0 ? "最新" : `第 ${index + 1} 次`}
                          </Badge>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDate(record.createdAt)}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {record.operator}
                          </div>
                        </div>

                        {/* Value Change */}
                        <div className="flex items-start gap-3 text-sm">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">
                              旧值
                            </div>
                            <div className="bg-muted p-2 rounded font-mono text-xs break-all">
                              {record.oldValue ? (
                                <span className="line-through text-muted-foreground">
                                  {truncateValue(record.oldValue)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground italic">
                                  (初始值)
                                </span>
                              )}
                            </div>
                          </div>

                          <ArrowRight className="h-4 w-4 text-muted-foreground mt-6 flex-shrink-0" />

                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">
                              新值
                            </div>
                            <div
                              className={`p-2 rounded font-mono text-xs break-all ${
                                index === 0
                                  ? "bg-primary/10 border border-primary/20"
                                  : "bg-green-50 dark:bg-green-950"
                              }`}
                            >
                              {truncateValue(record.newValue)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Footer with summary */}
        {!loading && !error && history.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground text-center">
              共 {history.length} 条修改记录
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
