"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, FileText, X, Calendar, User, FileText as FileTextIcon } from "lucide-react";
import dynamic from "next/dynamic";
import { logArchiveDownloadAction } from "@/app/(archive)/archives/actions";
import type { ArchiveItem } from "@/services/archive.service";

// Dynamic import PdfViewer to avoid SSR issues
const PdfViewer = dynamic(
  () => import("@/components/pdf/pdf-viewer").then(mod => ({ default: mod.PdfViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface PdfPreviewByIdProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  archiveId: string | null;
}

export function PdfPreviewById({
  open,
  onOpenChange,
  archiveId,
}: PdfPreviewByIdProps) {
  const [archive, setArchive] = useState<ArchiveItem | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loggingDownload, setLoggingDownload] = useState<boolean>(false);

  // Fetch archive data when dialog opens or archiveId changes
  useEffect(() => {
    if (open && archiveId) {
      fetchArchive(archiveId);
    } else {
      setArchive(null);
      setFileUrl("");
    }
  }, [open, archiveId]);

  const fetchArchive = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/archives/${id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch archive");
      }
      const data: ArchiveItem = await response.json();
      setArchive(data);
      setFileUrl(data.fileUrl || "");
    } catch (error) {
      console.error("Failed to fetch archive:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (!archive || !fileUrl) return;

    setLoggingDownload(true);

    try {
      await logArchiveDownloadAction(archive.archiveID);
      window.open(fileUrl, "_blank");
    } catch (err) {
      console.error("Failed to log download:", err);
      window.open(fileUrl, "_blank");
    } finally {
      setLoggingDownload(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("zh-CN");
  };

  // Info items for left sidebar
  const infoItems = archive ? [
    { label: "档号", value: archive.archiveNo, icon: FileTextIcon },
    { label: "全宗号", value: archive.fondsNo },
    { label: "年度", value: archive.year },
    { label: "保管期限", value: archive.retentionPeriod },
    { label: "保管期限代码", value: archive.retentionCode },
    { label: "责任者", value: archive.responsible, icon: User },
    { label: "文号", value: archive.docNo || "-" },
    { label: "日期", value: formatDate(archive.date), icon: Calendar },
    { label: "页数", value: archive.pageNo || "-" },
    { label: "部门", value: archive.deptIssue },
    { label: "盒号", value: archive.boxNo },
    { label: "件号", value: archive.pieceNo },
    { label: "机构代码", value: archive.deptCode },
  ].filter(item => item.value) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden"
        style={{ width: '96vw', height: '96vh', maxWidth: '96vw', maxHeight: '96vh' }}
      >
        <div className="flex h-full">
          {/* Left Sidebar - Archive Info */}
          <div className="w-44 border-r bg-muted/30 flex-shrink-0 overflow-y-auto">
            <div className="p-3 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <DialogTitle className="text-sm font-semibold">档案信息</DialogTitle>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Loading State */}
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : archive ? (
                <>
                  {/* Archive Title */}
                  <div className="pb-3 border-b">
                    <h3 className="font-semibold text-base leading-tight break-words">
                      {archive.title || "-"}
                    </h3>
                  </div>

                  {/* Info Items */}
                  <div className="space-y-2">
                    {infoItems.map((item, index) => (
                      <div key={index} className="space-y-0.5">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          {item.label}
                        </div>
                        <div className="flex items-start gap-1.5">
                          {item.icon && <item.icon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />}
                          <span className="text-xs break-words">{item.value}</span>
                        </div>
                      </div>
                    ))}

                    {/* Remark */}
                    {archive.remark && (
                      <div className="space-y-0.5">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          备注
                        </div>
                        <p className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                          {archive.remark}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Download Button */}
                  {archive.fileUrl && (
                    <Button
                      onClick={handleDownload}
                      disabled={loggingDownload}
                      className="w-full"
                      size="sm"
                    >
                      {loggingDownload ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          下载中...
                        </>
                      ) : (
                        <>
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          下载 PDF
                        </>
                      )}
                    </Button>
                  )}
                </>
              ) : null}
            </div>
          </div>

          {/* Right Side - PDF Viewer */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 bg-background overflow-hidden">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    <p className="text-sm text-muted-foreground">正在加载档案信息...</p>
                  </div>
                </div>
              ) : fileUrl ? (
                <PdfViewer
                  fileUrl={fileUrl}
                  fileName={archive?.archiveNo ? `${archive.archiveNo}.pdf` : "档案.pdf"}
                  downloadAllowed={false}
                  height="100%"
                  showToolbar={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center space-y-4 max-w-md">
                    <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground">该档案没有关联的 PDF 文件</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
