"use client";

import { useState, useEffect } from "react";
import { Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

// Dynamic import PdfViewer to avoid SSR issues
const PdfViewer = dynamic(
  () => import("@/components/pdf/pdf-viewer").then(mod => ({ default: mod.PdfViewer })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    ),
  }
);

interface Archive {
  id: string;
  archiveNo: string | null;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  fileUrl: string;
  fileName: string;
  fileSize: number;
  status: string;
  metadata: Record<string, unknown> | null;
  deptIssue: string | null;
  responsible: string | null;
  docNo: string | null;
  remark: string | null;
  year: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function ArchiveDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [archive, setArchive] = useState<Archive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchArchive();
  }, [params.id]);

  async function fetchArchive() {
    setLoading(true);
    try {
      const response = await fetch(`/api/archives/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setArchive(data);
      } else {
        setError(data.error || "加载档案失败");
      }
    } catch (err) {
      setError("加载档案失败");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error || !archive) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error || "档案不存在"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" onClick={() => router.back()}>
            ← 返回
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/archives/${archive.id}/edit`)}>
            编辑
          </Button>
          <Button onClick={() => window.open(archive.fileUrl, "_blank")}>
            下载 PDF
          </Button>
        </div>
      </div>

      {/* Archive Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl">{archive.title}</CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                档号: {archive.id}
              </p>
            </div>
            <Badge
              variant={
                archive.status === "active"
                  ? "default"
                  : archive.status === "archived"
                  ? "secondary"
                  : "destructive"
              }
            >
              {archive.status === "active"
                ? "正常"
                : archive.status === "archived"
                ? "已归档"
                : "已删除"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {archive.description && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">
                描述
              </h3>
              <p className="text-gray-600">{archive.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-1">
                档号
              </h3>
              <p className="text-gray-600">{archive.archiveNo || "-"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-1">
                分类
              </h3>
              <p className="text-gray-600">{archive.category || "-"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-1">
                机构问题
              </h3>
              <p className="text-gray-600">{archive.deptIssue || "-"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-1">
                责任者
              </h3>
              <p className="text-gray-600">{archive.responsible || "-"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-1">
                文号
              </h3>
              <p className="text-gray-600">{archive.docNo || "-"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-1">
                年度
              </h3>
              <p className="text-gray-600">{archive.year || "-"}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-1">
                文件名
              </h3>
              <p className="text-gray-600 truncate">{archive.fileName}</p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-1">
                文件大小
              </h3>
              <p className="text-gray-600">
                {(archive.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-1">
                创建时间
              </h3>
              <p className="text-gray-600">
                {new Date(archive.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          {archive.remark && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">
                备注
              </h3>
              <p className="text-gray-600">{archive.remark}</p>
            </div>
          )}

          {archive.tags && archive.tags.length > 0 && (
            <div>
              <h3 className="font-semibold text-sm text-gray-700 mb-2">
                标签
              </h3>
              <div className="flex flex-wrap gap-2">
                {archive.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PDF 预览 */}
      <div>
        <PdfViewer
          fileUrl={archive.fileUrl}
          fileName={archive.fileName}
          downloadAllowed={true}
          watermark="档案管理系统"
        />
      </div>
    </div>
  );
}
