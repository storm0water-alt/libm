"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { X, FileText, HardDrive, Upload, XCircle, Filter } from "lucide-react";
import type { PdfFile } from "@/services/import.service";
import { toast } from "sonner";
import { scanFolderAction } from "@/app/(archive)/import/actions";
import { ServerFileBrowser } from "./server-file-browser";

interface FileUploadProps {
  onFilesSelected: (files: PdfFile[]) => void;
  disabled?: boolean;
  selectedFiles?: PdfFile[];
}

interface ScanFilter {
  minSize?: number;
  maxSize?: number;
  namePattern?: string;
}

/**
 * File upload component with advanced features:
 * - Real-time scan progress
 * - Cancel scanning
 * - File filtering
 */
export function FileUpload({ onFilesSelected, disabled = false, selectedFiles = [] }: FileUploadProps) {
  const [files, setFiles] = useState<PdfFile[]>(selectedFiles);
  const [scanning, setScanning] = useState(false);
  const [uploadMode, setUploadMode] = useState<"local" | "upload">("local");
  const [scanProgress, setScanProgress] = useState<{ dirs: number; files: number; path: string } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ScanFilter>({});

  const handlePathSelected = async (path: string) => {
    setScanning(true);
    setScanProgress(null);
    abortControllerRef.current = new AbortController();
    
    try {
      const result = await scanFolderAction(path, {
        maxDepth: 10,
        concurrent: true,
        filter: filters,
        useCache: true,
      });

      if (!result.success) {
        toast.error(result.error || "扫描文件夹失败");
        return;
      }

      const scannedFiles = result.data || [];
      if (scannedFiles.length === 0) {
        toast.warning("文件夹中没有找到符合条件的 PDF 文件");
        return;
      }

      setFiles(scannedFiles);
      onFilesSelected(scannedFiles);
      toast.success(`找到 ${scannedFiles.length} 个 PDF 文件`);
    } catch (error) {
      if (error instanceof Error && error.message === 'Scan cancelled by user') {
        toast.info("扫描已取消");
      } else {
        console.error("Scan folder error:", error);
        toast.error(error instanceof Error ? error.message : "扫描文件夹失败");
      }
    } finally {
      setScanning(false);
      setScanProgress(null);
      abortControllerRef.current = null;
    }
  };

  const handleCancelScan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      toast.info("正在取消扫描...");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      const uploadedFiles: PdfFile[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (file.name.toLowerCase().endsWith(".pdf")) {
          uploadedFiles.push({
            name: file.name,
            path: (file as any).webkitRelativePath || file.name,
            size: file.size,
            file: file,
          });
        }
      }

      setFiles(uploadedFiles);
      onFilesSelected(uploadedFiles);
      toast.success(`已选择 ${uploadedFiles.length} 个文件`);
    } catch (error) {
      console.error("File select error:", error);
      toast.error("文件选择失败");
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesSelected(newFiles);
  };

  const handleClearAll = () => {
    setFiles([]);
    onFilesSelected([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Mode Selection Tabs */}
          <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as "local" | "upload")} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="local">
                <HardDrive className="h-4 w-4 mr-2" />
                本地复制
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="h-4 w-4 mr-2" />
                浏览器上传
              </TabsTrigger>
            </TabsList>

            {/* Mode 1: Local Copy */}
            <TabsContent value="local" className="space-y-4">
              <div className="space-y-2">
                <Label>浏览服务器文件系统</Label>
                <p className="text-sm text-muted-foreground">
                  选择移动硬盘或源文件夹，系统将使用 <code>cp</code> 命令直接复制文件
                </p>
              </div>

              {/* Filter Options */}
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  disabled={disabled || scanning}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? "隐藏过滤选项" : "显示过滤选项"}
                </Button>

                {showFilters && (
                  <Card className="p-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="min-size">最小大小 (MB)</Label>
                        <Input
                          id="min-size"
                          type="number"
                          placeholder="无限制"
                          value={filters.minSize ? filters.minSize / (1024 * 1024) : ""}
                          onChange={(e) => setFilters({
                            ...filters,
                            minSize: e.target.value ? parseFloat(e.target.value) * 1024 * 1024 : undefined
                          })}
                          disabled={disabled || scanning}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="max-size">最大大小 (MB)</Label>
                        <Input
                          id="max-size"
                          type="number"
                          placeholder="无限制"
                          value={filters.maxSize ? filters.maxSize / (1024 * 1024) : ""}
                          onChange={(e) => setFilters({
                            ...filters,
                            maxSize: e.target.value ? parseFloat(e.target.value) * 1024 * 1024 : undefined
                          })}
                          disabled={disabled || scanning}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name-pattern">文件名模式</Label>
                        <Input
                          id="name-pattern"
                          type="text"
                          placeholder="例如: 合同_*.pdf"
                          value={filters.namePattern || ""}
                          onChange={(e) => setFilters({
                            ...filters,
                            namePattern: e.target.value || undefined
                          })}
                          disabled={disabled || scanning}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      * 过滤条件可选，留空表示不限制
                    </p>
                  </Card>
                )}
              </div>

              {/* Scan Progress */}
              {scanning && scanProgress && (
                <Card className="p-4 border-blue-200 bg-blue-50">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin">⏳</div>
                        <span className="font-medium">正在扫描...</span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelScan}
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        取消
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>已扫描目录:</span>
                        <span className="font-medium">{scanProgress.dirs}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>找到文件:</span>
                        <span className="font-medium text-green-600">{scanProgress.files}</span>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        当前: {scanProgress.path}
                      </div>
                    </div>

                    <Progress value={scanProgress.files > 0 ? 100 : 50} className="h-2" />
                  </div>
                </Card>
              )}

              <ServerFileBrowser
                onPathSelected={handlePathSelected}
                disabled={disabled || scanning}
              />
            </TabsContent>

            {/* Mode 2: Browser Upload */}
            <TabsContent value="upload" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file-upload">选择文件夹</Label>
                <Input
                  id="file-upload"
                  type="file"
                  webkitdirectory=""
                  directory=""
                  multiple
                  accept=".pdf"
                  onChange={handleFileSelect}
                  disabled={disabled}
                  className="cursor-pointer"
                />
                <p className="text-sm text-muted-foreground">
                  适用于：远程访问或文件在个人电脑上。将通过浏览器上传文件
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>待入库文件 ({files.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={disabled}
                >
                  清空列表
                </Button>
              </div>

              <div className="border rounded-md max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">#</TableHead>
                      <TableHead>文件名</TableHead>
                      <TableHead className="w-[120px]">大小</TableHead>
                      <TableHead className="w-[80px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-red-500" />
                            <span className="font-medium">{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{formatFileSize(file.size)}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFile(index)}
                            disabled={disabled}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="text-sm text-muted-foreground">
                总计: {files.length} 个文件，总大小: {formatFileSize(files.reduce((sum, f) => sum + f.size, 0))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
