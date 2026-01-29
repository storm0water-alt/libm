"use client";

import { useState, useRef } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { exportConfigsAction, importConfigsAction } from "@/app/(archive)/config/actions";
import { Download, Upload, AlertCircle, CheckCircle2, FileJson } from "lucide-react";

interface ExportImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportResult {
  success: number;
  skipped: number;
  failed: number;
}

export function ExportImportDialog({
  open,
  onOpenChange,
}: ExportImportDialogProps) {
  const [mode, setMode] = useState<"export" | "import">("export");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setMode("export");
      setError("");
      setImportResult(null);
    }
    onOpenChange(newOpen);
  };

  // Handle export
  const handleExport = async () => {
    setLoading(true);
    setError("");

    try {
      const result = await exportConfigsAction();

      if (result.success && result.data) {
        // Create JSON blob and download
        const configs = result.data as any[];
        const json = JSON.stringify(configs, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `system-config-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        // Close dialog after successful export
        onOpenChange(false);
      } else {
        setError(result.error || "导出失败");
      }
    } catch (err) {
      console.error("Failed to export configs:", err);
      setError("导出失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // Handle import
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setImportResult(null);

    try {
      // Read file
      const text = await file.text();
      const configs = JSON.parse(text);

      // Validate format
      if (!Array.isArray(configs)) {
        setError("配置文件格式错误：必须是数组");
        return;
      }

      // Import configs
      const result = await importConfigsAction(configs);

      if (result.success) {
        setImportResult(result.data as ImportResult);

        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setError(result.error || "导入失败");
      }
    } catch (err) {
      console.error("Failed to import configs:", err);
      if (err instanceof SyntaxError) {
        setError("配置文件格式错误：无效的 JSON");
      } else {
        setError("导入失败，请重试");
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle mode switch
  const handleModeSwitch = (newMode: "export" | "import") => {
    setMode(newMode);
    setError("");
    setImportResult(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === "export" ? (
              <>
                <Download className="inline mr-2 h-5 w-5" />
                导出配置
              </>
            ) : (
              <>
                <Upload className="inline mr-2 h-5 w-5" />
                导入配置
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === "export"
              ? "将所有系统配置导出为 JSON 文件"
              : "从 JSON 文件导入系统配置"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {mode === "export" ? (
            <div className="space-y-4">
              <Alert>
                <FileJson className="h-4 w-4" />
                <AlertDescription>
                  导出将生成一个包含所有当前系统配置的 JSON 文件。该文件可用于备份或在其他环境中导入配置。
                </AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>导出内容包括：</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>配置键</li>
                  <li>配置值</li>
                  <li>配置类型</li>
                  <li>描述信息</li>
                  <li>分组</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <FileJson className="h-4 w-4" />
                <AlertDescription>
                  选择一个之前导出的 JSON 配置文件。已存在的配置键将被跳过，不会覆盖现有配置。
                </AlertDescription>
              </Alert>

              {/* File Input */}
              <div className="grid gap-2">
                <Label htmlFor="configFile">选择配置文件</Label>
                <input
                  ref={fileInputRef}
                  id="configFile"
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={loading}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:mr-4 file:cursor-pointer file:border-0 file:bg-secondary file:px-4 file:py-1 file:text-sm file:font-medium hover:file:bg-secondary/80 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              {/* Import Result */}
              {importResult && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    <div className="space-y-1">
                      <p className="font-medium">导入完成</p>
                      <ul className="text-sm space-y-1">
                        <li>成功导入: {importResult.success} 条</li>
                        <li>跳过已存在: {importResult.skipped} 条</li>
                        {importResult.failed > 0 && (
                          <li className="text-destructive">
                            失败: {importResult.failed} 条
                          </li>
                        )}
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Import Rules */}
              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">导入规则：</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>仅新增不存在的配置</li>
                  <li>已存在的配置将被跳过</li>
                  <li>系统保留配置不会被导入</li>
                  <li>单次最多导入 1000 条配置</li>
                </ul>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <div className="flex gap-2 w-full justify-between">
            <div>
              <Button
                type="button"
                variant={mode === "export" ? "default" : "outline"}
                onClick={() => handleModeSwitch("export")}
                disabled={loading}
              >
                <Download className="mr-2 h-4 w-4" />
                导出
              </Button>
              <Button
                type="button"
                variant={mode === "import" ? "default" : "outline"}
                onClick={() => handleModeSwitch("import")}
                disabled={loading}
                className="ml-2"
              >
                <Upload className="mr-2 h-4 w-4" />
                导入
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              关闭
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
