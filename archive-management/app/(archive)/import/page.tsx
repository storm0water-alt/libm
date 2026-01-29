"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Loader2, AlertCircle, FileText, FileSpreadsheet } from "lucide-react";
import { FileUpload } from "@/components/import/file-upload";
import { ProgressList } from "@/components/import/progress-list";
import { HistoryTable } from "@/components/import/history-table";
import { CsvUpload } from "@/components/import/csv-upload";
import { CsvImportProgress } from "@/components/import/csv-import-progress";
import { startImportAction, uploadCsvAction } from "@/app/(archive)/import/actions";
import type { PdfFile } from "@/services/import.service";
import { toast } from "sonner";
import type { ImportRecordWithProgress } from "@/services/import.service";

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export default function ImportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [selectedFiles, setSelectedFiles] = useState<PdfFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvImportRecordId, setCsvImportRecordId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pdf-upload" | "csv-upload" | "progress" | "history">("pdf-upload");
  const [csvValidated, setCsvValidated] = useState(false);
  const [csvValidatedArchiveNos, setCsvValidatedArchiveNos] = useState<string[]>([]);

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleFilesSelected = (files: PdfFile[]) => {
    setSelectedFiles(files);
  };

  const handleCsvFileSelected = (file: File | null) => {
    setCsvFile(file || null);
    setCsvValidated(false); // Reset validation status when file changes
    setCsvValidatedArchiveNos([]);
  };

  const handleValidationComplete = (archiveNos: string[]) => {
    // Only mark as validated if archiveNos is not empty
    if (archiveNos && archiveNos.length > 0) {
      setCsvValidated(true);
      setCsvValidatedArchiveNos(archiveNos);
    }
  };

  const handleStartImport = async () => {
    if (selectedFiles.length === 0) {
      toast.error("请先选择要入库的文件");
      return;
    }

    setImporting(true);
    try {
      // Check if files need to be uploaded (browser upload mode)
      const hasBrowserFiles = selectedFiles.some(f => f.file);

      let filesForImport: Array<{ name: string; path: string; size: number }> = [];

      if (hasBrowserFiles) {
        // Browser Upload Mode: Upload files first
        const CHUNK_SIZE = 600 * 1024; // 600KB per chunk

        for (const file of selectedFiles) {
          if (!file.file) {
            // Already on server (local copy mode)
            filesForImport.push({
              name: file.name,
              path: file.path,
              size: file.size,
            });
            continue;
          }

          // Upload file in chunks
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 15);
          const sanitizedName = file.name.replace(/[\/\\:*?"<>|]/g, "-");
          const fileName = `${timestamp}-${randomStr}-${sanitizedName}`;
          const totalChunks = Math.ceil(file.file.size / CHUNK_SIZE);

          for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.file.size);
            const chunk = file.file.slice(start, end);

            const formData = new FormData();
            formData.append("chunk", chunk);
            formData.append("fileName", fileName);
            formData.append("chunkIndex", chunkIndex.toString());
            formData.append("totalChunks", totalChunks.toString());

            const response = await fetch("/api/upload/chunk", {
              method: "POST",
              body: formData,
              credentials: "include",
            });

            if (!response.ok) {
              throw new Error(`分片上传失败 (${response.status})`);
            }

            const result = await response.json();

            if (!result.success) {
              throw new Error(result.error || "分片上传失败");
            }

            if (result.complete) {
              filesForImport.push({
                name: result.name,
                path: result.path,
                size: result.size,
              });
            }
          }
        }
      } else {
        // Local Copy Mode: Files already on server
        filesForImport = selectedFiles.map(file => ({
          name: file.name,
          path: file.path,
          size: file.size,
        }));
      }

      // Start import process
      const result = await startImportAction(filesForImport);

      if (result.success) {
        toast.success(`已提交 ${selectedFiles.length} 个文件，正在后台处理...`);
        setSelectedFiles([]);
        setActiveTab("progress");
      } else {
        toast.error(result.error || "启动入库失败");
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error(error instanceof Error ? error.message : "启动入库失败");
    } finally {
      setImporting(false);
    }
  };

  const handleStartCsvImport = async () => {
    if (!csvFile) {
      toast.error("请先选择 CSV 文件");
      return;
    }

    setCsvImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', csvFile);

      const result = await uploadCsvAction(formData);

      if (result.success) {
        toast.success(result.message || 'CSV 导入已开始');
        setCsvImportRecordId(result.importRecordId);
        setActiveTab("progress");
      } else {
        toast.error(result.error || 'CSV 导入失败');
      }
    } catch (error) {
      console.error('CSV import error:', error);
      toast.error(error instanceof Error ? error.message : 'CSV 导入失败');
    } finally {
      setCsvImporting(false);
    }
  };

  const handleImportComplete = (record: ImportRecordWithProgress) => {
    toast.success(`文件 "${record.fileName}" 入库完成`);
  };

  const handleCsvImportComplete = (result: any) => {
    const successCount = result.processed - result.failed;
    toast.success(`CSV 导入完成：成功 ${successCount} 条，失败 ${result.failed} 条`);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">档案入库</h1>
        <p className="text-muted-foreground mt-2">
          批量导入 PDF 文件或 CSV 信息表到档案管理系统
        </p>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="pdf-upload">
            <Upload className="h-4 w-4 mr-2" />
            PDF入库
          </TabsTrigger>
          <TabsTrigger value="csv-upload">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV导入
          </TabsTrigger>
          <TabsTrigger value="progress">
            <Loader2 className="h-4 w-4 mr-2" />
            处理进度
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="h-4 w-4 mr-2" />
            历史记录
          </TabsTrigger>
        </TabsList>

        {/* PDF Upload Tab */}
        <TabsContent value="pdf-upload" className="space-y-4">
          <FileUpload
            onFilesSelected={handleFilesSelected}
            disabled={importing}
            selectedFiles={selectedFiles}
          />

          {selectedFiles.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">已选择 {selectedFiles.length} 个文件</p>
                    <p className="text-sm text-muted-foreground">
                      总大小: {formatFileSize(selectedFiles.reduce((sum, f) => sum + f.size, 0))}
                    </p>
                  </div>
                  <Button
                    onClick={handleStartImport}
                    disabled={importing}
                    size="lg"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        启动中...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        开始入库
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedFiles.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                入库过程中，文件将被重命名并存储到系统配置的目录中。您可以切换到"处理进度"标签页查看实时进度。
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* CSV Upload Tab */}
        <TabsContent value="csv-upload" className="space-y-4">
          <CsvUpload
            onFileSelected={handleCsvFileSelected}
            onValidationComplete={handleValidationComplete}
            disabled={csvImporting}
          />

          {csvFile && csvValidated && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">已选择文件</p>
                    <p className="text-sm text-muted-foreground">
                      {csvFile.name} ({formatFileSize(csvFile.size)})
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      ✓ 已通过校验，{csvValidatedArchiveNos.length} 条记录可导入
                    </p>
                  </div>
                  <Button
                    onClick={handleStartCsvImport}
                    disabled={csvImporting}
                    size="lg"
                  >
                    {csvImporting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        导入中...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        开始导入
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Progress Tab */}
        <TabsContent value="progress" className="space-y-4">
          {/* CSV Import Progress */}
          {csvImportRecordId && (
            <CsvImportProgress
              importRecordId={csvImportRecordId}
              onComplete={handleCsvImportComplete}
            />
          )}

          {/* PDF Import Progress */}
          <ProgressList
            onComplete={handleImportComplete}
            autoRefresh
            refreshInterval={2000}
          />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <HistoryTable
            autoRefresh
            refreshInterval={10000}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
