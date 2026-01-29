"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface CsvUploadProps {
  onFileSelected: (file: File) => void;
  onValidationComplete?: (archiveNos: string[]) => void;
  disabled?: boolean;
}

interface FormatValidationResult {
  totalRecords: number;
  archiveNos: string[];
  emptyArchiveNos?: { row: number; index: number }[];
  duplicateArchiveNos?: { archiveNo: string; rows: number[] }[];
}

interface ExistValidationResult {
  total: number;
  existCount: number;
  notExistCount: number;
  notExistArchiveNos: string[];
}

type ValidationStep = "idle" | "format" | "exist" | "ready";

/**
 * CSV file upload component with 3-step validation
 * Step 1: Format validation - check for empty and duplicate archive numbers
 * Step 2: Exist validation - check if archive numbers exist in database
 * Step 3: Ready to import
 */
export function CsvUpload({ onFileSelected, onValidationComplete, disabled = false }: CsvUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState<ValidationStep>("idle");
  const [validating, setValidating] = useState(false);
  const [formatResult, setFormatResult] = useState<FormatValidationResult | null>(null);
  const [existResult, setExistResult] = useState<ExistValidationResult | null>(null);
  const [inputKey, setInputKey] = useState<number>(0); // Add key to force input re-render

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.csv')) {
      toast.error('请选择 CSV 文件');
      return;
    }

    // Reset all states for new file
    setSelectedFile(file);
    setCurrentStep("format");
    setFormatResult(null);
    setExistResult(null);
    setValidating(false);

    // Notify parent component - reset validation status
    onFileSelected(file);
    // Don't call onValidationComplete here - only call it after step 2 succeeds

    // Auto-start format validation
    await validateFormat(file);
  };

  const validateFormat = async (file: File) => {
    setValidating(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("step", "format");

      const response = await fetch("/api/import/csv/validate", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setFormatResult(result.data);
        // Stay on format step to show "Continue" button
        // Don't auto-advance to exist step
        setCurrentStep("format");
        toast.success(`格式校验通过：共 ${result.data.totalRecords} 条记录`);
      } else {
        setFormatResult(result.data);
        setCurrentStep("format");
        toast.error(result.error || "格式校验失败");
      }
    } catch (error) {
      console.error("Format validation error:", error);
      toast.error("格式校验失败");
    } finally {
      setValidating(false);
    }
  };

  const validateExist = async () => {
    if (!formatResult || !selectedFile) return;

    setValidating(true);
    setExistResult(null); // Clear previous result
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("step", "exist");
      formData.append("archiveNos", JSON.stringify(formatResult.archiveNos));

      const response = await fetch("/api/import/csv/validate", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setExistResult(result.existCheck);
        setCurrentStep("ready");
        toast.success("档号校验通过，可以开始导入");
        onValidationComplete(formatResult.archiveNos);
      } else {
        setExistResult(result.existCheck);
        setCurrentStep("exist");
        toast.error(result.error || "档号校验失败");
      }
    } catch (error) {
      console.error("Exist validation error:", error);
      const errorMessage = error instanceof Error ? error.message : "档号校验失败";

      // Set error result to display in UI
      setExistResult({
        total: formatResult.archiveNos.length,
        existCount: 0,
        notExistCount: formatResult.archiveNos.length,
        notExistArchiveNos: formatResult.archiveNos,
      });
      setCurrentStep("exist");

      toast.error(`档号校验失败: ${errorMessage}`);
    } finally {
      setValidating(false);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setCurrentStep("idle");
    setFormatResult(null);
    setExistResult(null);
    setValidating(false);
    setInputKey(prev => prev + 1); // Force input re-render to allow selecting same file again
    onFileSelected(null as unknown as File);
    onValidationComplete?.([]);
  };

  const handleRetryFormat = () => {
    if (selectedFile) {
      validateFormat(selectedFile);
    }
  };

  const handleRetryExist = () => {
    validateExist();
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
          {/* Step Indicator */}
          {selectedFile && (
            <div className="flex items-center gap-2 pb-4 border-b">
              <StepBadge
                number={1}
                label="格式校验"
                status={
                  currentStep === "format"
                    ? validating
                      ? "loading"
                      : (formatResult?.emptyArchiveNos?.length || 0) === 0 &&
                          (formatResult?.duplicateArchiveNos?.length || 0) === 0
                      ? "success"
                      : "error"
                    : currentStep === "exist" || currentStep === "ready"
                    ? "success"
                    : "pending"
                }
              />
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <StepBadge
                number={2}
                label="档号校验"
                status={
                  currentStep === "exist"
                    ? validating
                      ? "loading"
                      : existResult?.notExistCount === 0
                      ? "success"
                      : "error"
                    : currentStep === "ready"
                    ? "success"
                    : "pending"
                }
              />
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <StepBadge
                number={3}
                label="导入"
                status={currentStep === "ready" ? "success" : "pending"}
              />
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-upload">选择 CSV 文件</Label>
            <Input
              key={inputKey}
              id="csv-upload"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={disabled}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground">
              上传档案信息表（CSV 格式），系统将自动进行格式校验和档号校验
            </p>
          </div>

          {/* File Info */}
          {selectedFile && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <div className="font-medium">{selectedFile.name}</div>
                    <div className="text-sm text-muted-foreground">
                      大小: {formatFileSize(selectedFile.size)}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClear}
                  disabled={disabled}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Format Validation Result */}
          {currentStep === "format" && formatResult && (
            <ValidationResultCard
              title="格式校验结果"
              success={
                (formatResult.emptyArchiveNos?.length || 0) === 0 &&
                (formatResult.duplicateArchiveNos?.length || 0) === 0
              }
            >
              <div className="space-y-3">
                <div className="text-sm">
                  <span className="font-medium">总记录数：</span>
                  {formatResult.totalRecords} 条
                </div>

                {formatResult.emptyArchiveNos?.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-red-600 mb-2">
                      ❌ 空白档号 ({formatResult.emptyArchiveNos.length} 个)
                    </div>
                    <div className="max-h-32 overflow-y-auto bg-red-50 p-2 rounded text-xs">
                      {formatResult.emptyArchiveNos.map((item) => (
                        <Badge key={item.index} variant="destructive" className="m-1">
                          第 {item.row} 行
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {formatResult.duplicateArchiveNos?.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-red-600 mb-2">
                      ❌ 重复档号 ({formatResult.duplicateArchiveNos.length} 个)
                    </div>
                    <div className="max-h-32 overflow-y-auto bg-red-50 p-2 rounded text-xs space-y-1">
                      {formatResult.duplicateArchiveNos.map(({ archiveNo, rows }) => (
                        <div key={archiveNo} className="flex items-center gap-2">
                          <Badge variant="destructive">{archiveNo}</Badge>
                          <span className="text-gray-600">
                            第 {rows.join(", ")} 行
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(formatResult.emptyArchiveNos?.length || 0) === 0 &&
                  (formatResult.duplicateArchiveNos?.length || 0) === 0 && (
                    <Button onClick={validateExist} disabled={validating} className="w-full">
                      {validating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          校验中...
                        </>
                      ) : (
                        <>
                          继续档号校验 <ChevronRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}

                {(formatResult.emptyArchiveNos?.length > 0 ||
                  formatResult.duplicateArchiveNos?.length > 0) && (
                  <div className="space-y-3">
                    {/* Error alert */}
                    <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-950/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-900 dark:text-red-100">
                          <div className="font-medium mb-1">格式校验失败</div>
                          <div className="text-xs">
                            CSV 文件存在格式问题，请修正后重新上传文件。
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Solution hint */}
                    <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-900 dark:text-blue-100">
                          <div className="font-medium mb-1">修正方法</div>
                          <ul className="list-disc list-inside space-y-0.5 text-xs">
                            <li>确保所有行都有档号，不能为空</li>
                            <li>确保档号唯一，不能重复</li>
                            <li>修改 CSV 文件后，请重新选择文件上传</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleClear} variant="outline" className="flex-1">
                        重新选择文件
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ValidationResultCard>
          )}

          {/* Exist Validation Result - Loading State */}
          {currentStep === "exist" && validating && !existResult && (
            <div className="border rounded-lg p-8 bg-gray-50 dark:bg-gray-900">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  正在校验档号，请稍候...
                </div>
              </div>
            </div>
          )}

          {/* Exist Validation Result - With Data */}
          {currentStep === "exist" && existResult && (
            <ValidationResultCard
              title="档号校验结果"
              success={existResult.notExistCount === 0}
            >
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-blue-50 p-3 rounded">
                    <div className="text-2xl font-bold text-blue-600">{existResult.total}</div>
                    <div className="text-xs text-gray-600">总档号数</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded">
                    <div className="text-2xl font-bold text-green-600">{existResult.existCount}</div>
                    <div className="text-xs text-gray-600">已存在</div>
                  </div>
                  <div className="bg-red-50 p-3 rounded">
                    <div className="text-2xl font-bold text-red-600">{existResult.notExistCount}</div>
                    <div className="text-xs text-gray-600">不存在</div>
                  </div>
                </div>

                {existResult.notExistArchiveNos.length > 0 && (
                  <div>
                    <div className="text-sm font-medium text-red-600 mb-2">
                      以下档号在数据库中不存在：
                    </div>
                    <div className="max-h-40 overflow-y-auto bg-red-50 p-2 rounded text-xs">
                      {existResult.notExistArchiveNos.map((no) => (
                        <Badge key={no} variant="destructive" className="m-1">
                          {no}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {existResult.notExistCount === 0 && (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <div className="font-medium text-green-600">校验通过</div>
                    <div className="text-sm text-gray-600 mt-1">
                      所有 {existResult.total} 个档号都存在于数据库中
                    </div>
                  </div>
                )}

                {existResult.notExistCount > 0 && (
                  <div className="space-y-3">
                    {/* Error alert */}
                    <div className="border rounded-lg p-3 bg-red-50 dark:bg-red-950/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-red-900 dark:text-red-100">
                          <div className="font-medium mb-1">校验失败</div>
                          <div className="text-xs">
                            有 {existResult.notExistCount} 个档号在数据库中不存在，无法继续导入。
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Solution hint */}
                    <div className="border rounded-lg p-3 bg-blue-50 dark:bg-blue-950/20">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-900 dark:text-blue-100">
                          <div className="font-medium mb-1">解决方法</div>
                          <ul className="list-disc list-inside space-y-0.5 text-xs">
                            <li>先通过"PDF入库"上传对应的档案文件</li>
                            <li>或者修改 CSV 文件，去掉不存在的档号</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleRetryExist} variant="outline" className="flex-1">
                        重新校验
                      </Button>
                      <Button onClick={handleClear} variant="ghost" className="flex-1">
                        取消导入
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ValidationResultCard>
          )}

          {/* Ready State */}
          {currentStep === "ready" && (
            <div className="border rounded-lg p-6 bg-green-50 dark:bg-green-950/20">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
                <div>
                  <div className="font-medium text-green-900 dark:text-green-100">
                    校验完成，可以开始导入
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">
                    {formatResult?.totalRecords} 条记录，所有档号均已验证
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Requirements Info */}
          {currentStep === "idle" && (
            <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <div className="font-medium mb-1">CSV 文件要求：</div>
                  <ul className="list-disc list-inside space-y-0.5 text-xs">
                    <li>必须包含"档号"列（用于匹配档案）</li>
                    <li>档号不能为空或重复</li>
                    <li>档号必须在系统中已存在（由 PDF 入库创建）</li>
                    <li>可选列：全宗号、保管期限、年度、题名等</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface StepBadgeProps {
  number: number;
  label: string;
  status: "pending" | "loading" | "success" | "error";
}

function StepBadge({ number, label, status }: StepBadgeProps) {
  const variants = {
    pending: "bg-gray-100 text-gray-500 border-gray-200",
    loading: "bg-blue-50 text-blue-600 border-blue-200",
    success: "bg-green-50 text-green-600 border-green-200",
    error: "bg-red-50 text-red-600 border-red-200",
  };

  const icons = {
    pending: <span className="text-xs">{number}</span>,
    loading: <Loader2 className="h-3 w-3 animate-spin" />,
    success: <CheckCircle2 className="h-3 w-3" />,
    error: <AlertCircle className="h-3 w-3" />,
  };

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${variants[status]}`}>
      {icons[status]}
      <span className="text-xs font-medium">{label}</span>
    </div>
  );
}

interface ValidationResultCardProps {
  title: string;
  success: boolean;
  children: React.ReactNode;
}

function ValidationResultCard({ title, success, children }: ValidationResultCardProps) {
  return (
    <div className={`border rounded-lg p-4 ${success ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
      <div className={`font-medium mb-3 ${success ? "text-green-900 dark:text-green-100" : "text-red-900 dark:text-red-100"}`}>
        {title}
      </div>
      {children}
    </div>
  );
}
