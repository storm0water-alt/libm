"use client";

import { useState } from "react";
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
import { X, FileText, HardDrive, Upload } from "lucide-react";
import type { PdfFile } from "@/services/import.service";
import { toast } from "sonner";
import { scanFolderAction } from "@/app/(archive)/import/actions";
import { ServerFileBrowser } from "./server-file-browser";

interface FileUploadProps {
  onFilesSelected: (files: PdfFile[]) => void;
  disabled?: boolean;
  selectedFiles?: PdfFile[];
}

/**
 * File upload component supporting two modes:
 * 1. Local Copy: Browse server file system and select folder (uses `cp` command)
 * 2. Browser Upload: Select files from user's computer (uses chunked upload)
 */
export function FileUpload({ onFilesSelected, disabled = false, selectedFiles = [] }: FileUploadProps) {
  const [files, setFiles] = useState<PdfFile[]>(selectedFiles);
  const [scanning, setScanning] = useState(false);
  const [uploadMode, setUploadMode] = useState<"local" | "upload">("local");

  // Mode 1: Local Copy - Browse and scan server-accessible folder
  const handlePathSelected = async (path: string) => {
    setScanning(true);
    try {
      const result = await scanFolderAction(path);

      if (!result.success) {
        toast.error(result.error || "扫描文件夹失败");
        return;
      }

      const scannedFiles = result.data || [];
      if (scannedFiles.length === 0) {
        toast.warning("文件夹中没有找到 PDF 文件");
        return;
      }

      setFiles(scannedFiles);
      onFilesSelected(scannedFiles);
      toast.success(`找到 ${scannedFiles.length} 个 PDF 文件`);
    } catch (error) {
      console.error("Scan folder error:", error);
      toast.error(error instanceof Error ? error.message : "扫描文件夹失败");
    } finally {
      setScanning(false);
    }
  };

  // Mode 2: Browser Upload - Select files from user's computer
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
            file: file, // Keep File object for upload
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

            {/* Mode 1: Local Copy - Browse server file system */}
            <TabsContent value="local" className="space-y-4">
              <div className="space-y-2">
                <Label>浏览服务器文件系统</Label>
                <p className="text-sm text-muted-foreground">
                  选择移动硬盘或源文件夹，系统将使用 <code>cp</code> 命令直接复制文件（速度快，支持大文件）
                </p>
              </div>

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
                  适用于：远程访问或文件在个人电脑上。将通过浏览器上传文件（受网络速度影响）
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
