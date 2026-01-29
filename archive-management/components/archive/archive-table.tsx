"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Eye, Edit, Trash2, Download, Package } from "lucide-react";
import { ResizableTable, type Column } from "@/components/ui/resizable-table";
import type { ArchiveItem } from "@/services/archive.service";
import { useState } from "react";

interface ArchiveTableProps {
  archives: ArchiveItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onView: (archive: ArchiveItem) => void;
  onEdit: (archive: ArchiveItem) => void;
  onDelete: (id: string) => void;
  onBatchDelete: (ids: string[]) => void;
  onDownload: (archive: ArchiveItem) => void;
}

export function ArchiveTable({
  archives,
  selectedIds,
  onSelectionChange,
  onView,
  onEdit,
  onDelete,
  onBatchDelete,
  onDownload,
}: ArchiveTableProps) {
  const [exporting, setExporting] = useState(false);
  // Define table columns with resizable widths
  const tableColumns: Column[] = [
    { id: "select", header: "", defaultWidth: 50, minWidth: 50 },
    { id: "archiveNo", header: "档号", defaultWidth: 140, minWidth: 100 },
    { id: "fondsNo", header: "全宗号", defaultWidth: 80, minWidth: 60 },
    { id: "year", header: "年度", defaultWidth: 70, minWidth: 60 },
    { id: "retentionPeriod", header: "保管期限", defaultWidth: 80, minWidth: 70 },
    { id: "title", header: "题名", defaultWidth: 200, minWidth: 150 },
    { id: "deptIssue", header: "机构问题", defaultWidth: 120, minWidth: 80 },
    { id: "responsible", header: "责任者", defaultWidth: 80, minWidth: 60 },
    { id: "docNo", header: "文号", defaultWidth: 100, minWidth: 80 },
    { id: "date", header: "日期", defaultWidth: 90, minWidth: 70 },
    { id: "boxNo", header: "盒号", defaultWidth: 70, minWidth: 60 },
    { id: "pieceNo", header: "件号", defaultWidth: 70, minWidth: 60 },
    { id: "pageNo", header: "页号", defaultWidth: 60, minWidth: 50 },
    { id: "actions", header: "操作", defaultWidth: 120, minWidth: 100 },
  ];

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(archives.map((a) => a.archiveID));
    } else {
      onSelectionChange([]);
    }
  };

  // Handle individual selection
  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((selectedId) => selectedId !== id));
    }
  };

  // Handle batch export
  const handleBatchExport = async () => {
    if (selectedIds.length === 0) return;

    // Filter archives that have PDF files
    const archivesWithPdf = archives.filter(
      (a) => selectedIds.includes(a.archiveID) && a.fileUrl && a.fileUrl.trim() !== ""
    );

    console.log("[Export] Selected IDs:", selectedIds);
    console.log("[Export] Archives with PDF:", archivesWithPdf.map(a => ({ id: a.archiveID, no: a.archiveNo, fileUrl: a.fileUrl })));

    if (archivesWithPdf.length === 0) {
      alert("所选档案没有可导出的PDF文件");
      return;
    }

    setExporting(true);
    try {
      const response = await fetch("/api/archives/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: archivesWithPdf.map(a => a.archiveID) }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "导出失败");
      }

      // Download the ZIP file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `archives_export_${Date.now()}.zip`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch && filenameMatch[1]) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Clear selection after successful export
      onSelectionChange([]);
    } catch (error) {
      console.error("Export error:", error);
      alert(error instanceof Error ? error.message : "导出失败");
    } finally {
      setExporting(false);
    }
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    // Handle various date formats
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr; // Return as-is if invalid
    }
    return date.toLocaleDateString("zh-CN");
  };

  // Get retention period badge variant
  const getRetentionBadgeVariant = (period: string) => {
    switch (period) {
      case "永久":
        return "destructive";
      case "长期":
        return "default";
      case "短期":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-4">
      {/* Batch actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-900 dark:text-blue-100">
            已选择 <span className="font-semibold">{selectedIds.length}</span> 项
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleBatchExport}
              disabled={exporting}
            >
              {exporting ? (
                <>
                  <Package className="h-4 w-4 mr-2 animate-pulse" />
                  导出中...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  批量导出
                </>
              )}
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onBatchDelete(selectedIds)}
              disabled={exporting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              批量删除
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <ResizableTable columns={tableColumns}>
          <TableHeader>
            <TableRow>
              <TableHead data-resizable-column="select" className="text-center">
                <Checkbox
                  checked={
                    archives.length > 0 &&
                    selectedIds.length === archives.length
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="全选"
                />
              </TableHead>
              <TableHead data-resizable-column="archiveNo">档号</TableHead>
              <TableHead data-resizable-column="fondsNo">全宗号</TableHead>
              <TableHead data-resizable-column="year">年度</TableHead>
              <TableHead data-resizable-column="retentionPeriod">保管期限</TableHead>
              <TableHead data-resizable-column="title">题名</TableHead>
              <TableHead data-resizable-column="deptIssue">机构问题</TableHead>
              <TableHead data-resizable-column="responsible">责任者</TableHead>
              <TableHead data-resizable-column="docNo">文号</TableHead>
              <TableHead data-resizable-column="date">日期</TableHead>
              <TableHead data-resizable-column="boxNo">盒号</TableHead>
              <TableHead data-resizable-column="pieceNo">件号</TableHead>
              <TableHead data-resizable-column="pageNo">页号</TableHead>
              <TableHead data-resizable-column="actions" className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {archives.length === 0 ? (
              <TableRow>
                <TableCell colSpan={tableColumns.length} className="text-center py-8 text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-gray-400" />
                    <p>暂无档案数据</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              archives.map((archive) => (
                <TableRow key={archive.archiveID}>
                  <TableCell data-column="select" className="text-center">
                    <Checkbox
                      checked={selectedIds.includes(archive.archiveID)}
                      onCheckedChange={(checked) =>
                        handleSelect(archive.archiveID, checked === true)
                      }
                      aria-label={`选择 ${archive.title}`}
                    />
                  </TableCell>
                  <TableCell data-column="archiveNo" className="font-medium">
                    <span
                      className="font-mono text-sm block truncate"
                      title={archive.archiveNo}
                    >
                      {archive.archiveNo}
                    </span>
                  </TableCell>
                  <TableCell data-column="fondsNo">
                    <span className="font-mono text-sm block truncate" title={archive.fondsNo}>
                      {archive.fondsNo}
                    </span>
                  </TableCell>
                  <TableCell data-column="year">
                    <Badge variant="outline">{archive.year}</Badge>
                  </TableCell>
                  <TableCell data-column="retentionPeriod">
                    <Badge variant={getRetentionBadgeVariant(archive.retentionPeriod)}>
                      {archive.retentionPeriod}
                    </Badge>
                  </TableCell>
                  <TableCell data-column="title">
                    <div className="max-w-xs">
                      <p
                        className="text-sm font-medium truncate"
                        title={archive.title}
                      >
                        {archive.title}
                      </p>
                      {archive.remark && (
                        <p
                          className="text-xs text-gray-500 mt-1 truncate"
                          title={archive.remark}
                        >
                          {archive.remark}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell data-column="deptIssue">
                    <span className="text-sm text-gray-600 block truncate" title={archive.deptIssue}>
                      {archive.deptIssue || "-"}
                    </span>
                  </TableCell>
                  <TableCell data-column="responsible">
                    <span className="text-sm text-gray-600 block truncate" title={archive.responsible}>
                      {archive.responsible || "-"}
                    </span>
                  </TableCell>
                  <TableCell data-column="docNo">
                    <span className="text-xs text-gray-600 font-mono block truncate" title={archive.docNo}>
                      {archive.docNo || "-"}
                    </span>
                  </TableCell>
                  <TableCell data-column="date">
                    <span className="text-sm text-gray-600">
                      {formatDate(archive.date)}
                    </span>
                  </TableCell>
                  <TableCell data-column="boxNo">
                    <span className="text-sm text-gray-600 font-mono">
                      {archive.boxNo}
                    </span>
                  </TableCell>
                  <TableCell data-column="pieceNo">
                    <span className="text-sm text-gray-600 font-mono">
                      {archive.pieceNo}
                    </span>
                  </TableCell>
                  <TableCell data-column="pageNo">
                    <span className="text-sm text-gray-600">
                      {archive.pageNo}
                    </span>
                  </TableCell>
                  <TableCell data-column="actions" className="text-right">
                    <div className="flex justify-end gap-1">
                      {archive.fileUrl && (
                        <Button
                          size="icon-xs"
                          variant="ghost"
                          onClick={() => onView(archive)}
                          title="预览PDF"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => onEdit(archive)}
                        title="编辑"
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        onClick={() => onDelete(archive.archiveID)}
                        title="删除"
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </ResizableTable>
      </div>
    </div>
  );
}
