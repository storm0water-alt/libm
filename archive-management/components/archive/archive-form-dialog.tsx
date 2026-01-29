"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createArchiveAction, updateArchiveAction } from "@/app/(archive)/archives/actions";
import { FileText, Loader2 } from "lucide-react";
import type { ArchiveItem, CreateArchiveInput, UpdateArchiveInput } from "@/services/archive.service";

interface ArchiveFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  archive?: ArchiveItem | null;
}

// Retention period options with codes
const RETENTION_PERIODS = [
  { label: "永久", value: "永久", code: "Y" },
  { label: "长期", value: "长期", code: "C" },
  { label: "短期", value: "短期", code: "D" },
  { label: "10年", value: "10年", code: "10" },
  { label: "30年", value: "30年", code: "30" },
];

export function ArchiveFormDialog({
  open,
  onOpenChange,
  onSuccess,
  archive,
}: ArchiveFormDialogProps) {
  const isEditing = !!archive;

  // Form state - all required fields from Prisma schema
  const [archiveNo, setArchiveNo] = useState(archive?.archiveNo || "");
  const [fondsNo, setFondsNo] = useState(archive?.fondsNo || "");
  const [retentionPeriod, setRetentionPeriod] = useState(archive?.retentionPeriod || "");
  const [retentionCode, setRetentionCode] = useState(archive?.retentionCode || "");
  const [year, setYear] = useState(archive?.year || "");
  const [deptCode, setDeptCode] = useState(archive?.deptCode || "");
  const [boxNo, setBoxNo] = useState(archive?.boxNo || "");
  const [pieceNo, setPieceNo] = useState(archive?.pieceNo || "");
  const [title, setTitle] = useState(archive?.title || "");
  const [deptIssue, setDeptIssue] = useState(archive?.deptIssue || "");
  const [responsible, setResponsible] = useState(archive?.responsible || "");
  const [docNo, setDocNo] = useState(archive?.docNo || "");
  const [date, setDate] = useState(archive?.date || "");
  const [pageNo, setPageNo] = useState(archive?.pageNo || "");
  const [remark, setRemark] = useState(archive?.remark || "");
  const [fileUrl, setFileUrl] = useState(archive?.fileUrl || "");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (archive) {
        // Editing mode - populate with existing data
        setArchiveNo(archive.archiveNo);
        setFondsNo(archive.fondsNo);
        setRetentionPeriod(archive.retentionPeriod);
        setRetentionCode(archive.retentionCode);
        setYear(archive.year);
        setDeptCode(archive.deptCode);
        setBoxNo(archive.boxNo);
        setPieceNo(archive.pieceNo);
        setTitle(archive.title);
        setDeptIssue(archive.deptIssue);
        setResponsible(archive.responsible);
        setDocNo(archive.docNo);
        setDate(archive.date);
        setPageNo(archive.pageNo);
        setRemark(archive.remark || "");
        setFileUrl(archive.fileUrl || "");
      } else {
        // Creating mode - reset form
        setArchiveNo("");
        setFondsNo("");
        setRetentionPeriod("");
        setRetentionCode("");
        setYear("");
        setDeptCode("");
        setBoxNo("");
        setPieceNo("");
        setTitle("");
        setDeptIssue("");
        setResponsible("");
        setDocNo("");
        setDate("");
        setPageNo("");
        setRemark("");
        setFileUrl("");
      }
      setError("");
    }
  }, [open, archive]);

  // Handle retention period change - auto-set retention code
  const handleRetentionPeriodChange = (value: string) => {
    setRetentionPeriod(value);
    const period = RETENTION_PERIODS.find((p) => p.value === value);
    if (period) {
      setRetentionCode(period.code);
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const requiredFields: Record<string, string> = {
      archiveNo: "档号",
      fondsNo: "全宗号",
      retentionPeriod: "保管期限",
      retentionCode: "保管期限代码",
      year: "年度",
      deptCode: "机构问题代码",
      boxNo: "盒号",
      pieceNo: "件号",
      title: "题名",
      deptIssue: "机构问题",
      responsible: "责任者",
      docNo: "文号",
      date: "日期",
      pageNo: "页号",
    };

    for (const [field, label] of Object.entries(requiredFields)) {
      const value = eval(field); // Get field value dynamically
      if (!value || value.toString().trim() === "") {
        setError(`${label}不能为空`);
        return;
      }
    }

    // Validate archive number format (basic check)
    if (archiveNo.length > 100) {
      setError("档号不能超过100个字符");
      return;
    }

    // Validate title length
    if (title.length > 200) {
      setError("题名不能超过200个字符");
      return;
    }

    // Validate date format (basic check for YYYY-MM-DD or similar)
    if (date && !/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(date)) {
      setError("日期格式应为 YYYY-MM-DD");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (isEditing && archive) {
        // Update existing archive
        const updateData: UpdateArchiveInput = {
          archiveNo,
          fondsNo,
          retentionPeriod,
          retentionCode,
          year,
          deptCode,
          boxNo,
          pieceNo,
          title,
          deptIssue,
          responsible,
          docNo,
          date,
          pageNo,
          remark: remark || undefined,
          fileUrl: fileUrl || undefined,
        };

        const result = await updateArchiveAction(archive.archiveID, updateData);

        if (result.success) {
          onSuccess();
          onOpenChange(false);
        } else {
          setError(result.error || "更新失败");
        }
      } else {
        // Create new archive
        const createData: CreateArchiveInput = {
          archiveNo,
          fondsNo,
          retentionPeriod,
          retentionCode,
          year,
          deptCode,
          boxNo,
          pieceNo,
          title,
          deptIssue,
          responsible,
          docNo,
          date,
          pageNo,
          remark: remark || undefined,
          fileUrl: fileUrl || undefined,
        };

        const result = await createArchiveAction(createData);

        if (result.success) {
          onSuccess();
          onOpenChange(false);
        } else {
          setError(result.error || "创建失败");
        }
      }
    } catch (err) {
      console.error("Failed to save archive:", err);
      setError("操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditing ? "编辑档案" : "新增档案"}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? "修改档案信息" : "填写档案信息"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Row 1: Archive No, Fonds No, Year */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="archiveNo">
                  档号 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="archiveNo"
                  value={archiveNo}
                  onChange={(e) => setArchiveNo(e.target.value)}
                  placeholder="例如: 2024-001-001-001"
                  disabled={isEditing}
                  required
                />
                {!isEditing && (
                  <p className="text-xs text-muted-foreground">
                    档号创建后不可修改
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fondsNo">
                  全宗号 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="fondsNo"
                  value={fondsNo}
                  onChange={(e) => setFondsNo(e.target.value)}
                  placeholder="例如: 001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="year">
                  年度 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="year"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder="例如: 2024"
                  required
                />
              </div>
            </div>

            {/* Row 2: Retention Period, Dept Code, Box No */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="retentionPeriod">
                  保管期限 <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={retentionPeriod || undefined}
                  onValueChange={handleRetentionPeriodChange}
                  required
                >
                  <SelectTrigger id="retentionPeriod">
                    <SelectValue placeholder="选择保管期限" />
                  </SelectTrigger>
                  <SelectContent>
                    {RETENTION_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="retentionCode">
                  保管期限代码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="retentionCode"
                  value={retentionCode}
                  onChange={(e) => setRetentionCode(e.target.value)}
                  placeholder="例如: Y"
                  required
                  readOnly
                  className="bg-muted"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deptCode">
                  机构问题代码 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deptCode"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value)}
                  placeholder="例如: 001"
                  required
                />
              </div>
            </div>

            {/* Row 3: Box No, Piece No, Doc No */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="boxNo">
                  盒号 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="boxNo"
                  value={boxNo}
                  onChange={(e) => setBoxNo(e.target.value)}
                  placeholder="例如: 001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pieceNo">
                  件号 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pieceNo"
                  value={pieceNo}
                  onChange={(e) => setPieceNo(e.target.value)}
                  placeholder="例如: 001"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="docNo">
                  文号 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="docNo"
                  value={docNo}
                  onChange={(e) => setDocNo(e.target.value)}
                  placeholder="例如: [2024] 1号"
                  required
                />
              </div>
            </div>

            {/* Row 4: Title (full width) */}
            <div className="space-y-2">
              <Label htmlFor="title">
                题名 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="档案题名"
                required
              />
            </div>

            {/* Row 5: Dept Issue, Responsible, Date */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deptIssue">
                  机构问题 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deptIssue"
                  value={deptIssue}
                  onChange={(e) => setDeptIssue(e.target.value)}
                  placeholder="例如: 办公室"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible">
                  责任者 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="responsible"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="例如: 张三"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">
                  日期 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Row 6: Page No, File URL */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pageNo">
                  页号 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pageNo"
                  value={pageNo}
                  onChange={(e) => setPageNo(e.target.value)}
                  placeholder="例如: 1-10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileUrl">PDF文件URL</Label>
                <Input
                  id="fileUrl"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://example.com/file.pdf"
                  type="url"
                />
                <p className="text-xs text-muted-foreground">
                  可选，用于PDF预览和下载
                </p>
              </div>
            </div>

            {/* Row 7: Remark (full width) */}
            <div className="space-y-2">
              <Label htmlFor="remark">备注</Label>
              <Textarea
                id="remark"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="备注信息（可选）"
                rows={3}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : isEditing ? (
                "保存"
              ) : (
                "创建"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
