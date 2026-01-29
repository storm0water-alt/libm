"use client";

import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileQuestion, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PdfViewerProps {
  fileUrl: string;
  fileName: string;
  downloadAllowed?: boolean;
  watermark?: string;
  height?: string;
  showToolbar?: boolean;
}

export function PdfViewer({
  fileUrl,
  fileName,
  downloadAllowed = true,
  watermark,
  height = "700px",
  showToolbar = true,
}: PdfViewerProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [fileExists, setFileExists] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleDownload = useCallback(() => {
    if (downloadAllowed && fileUrl && fileExists) {
      window.open(fileUrl, "_blank");
    }
  }, [downloadAllowed, fileUrl, fileExists]);

  // Check if PDF file exists
  useEffect(() => {
    const checkFileExists = async () => {
      if (!fileUrl) {
        setLoading(false);
        setFileExists(false);
        return;
      }

      try {
        const response = await fetch(fileUrl, { method: 'HEAD' });
        setFileExists(response.ok);
        setLoading(false);

        if (!response.ok) {
          if (response.status === 404) {
            setError("PDF 文件不存在");
          } else {
            setError(`无法加载 PDF 文件 (错误 ${response.status})`);
          }
        }
      } catch (err) {
        setLoading(false);
        setFileExists(false);
        setError("无法连接到服务器");
        console.error("File check error:", err);
      }
    };

    checkFileExists();
  }, [fileUrl]);

  return (
    <div className={showToolbar ? "space-y-4" : "h-full w-full"}>
      {/* 工具栏 */}
      {showToolbar && (
        <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{fileName}</h3>
              {watermark && (
                <Badge variant="outline" className="text-xs">
                  水印: {watermark}
                </Badge>
              )}
            </div>

            {/* 下载按钮 */}
            {downloadAllowed && fileExists && (
              <Button size="sm" variant="default" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                下载
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      )}

      {/* PDF 查看器 */}
      {showToolbar ? (
        <Card>
          <CardContent className="p-0">
            <div className="w-full flex items-center justify-center" style={{ height }}>
            {loading ? (
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                <p className="text-sm text-gray-500">正在检查 PDF 文件...</p>
              </div>
            ) : error ? (
              <div className="text-center space-y-4 max-w-md">
                <FileQuestion className="h-16 w-16 mx-auto text-gray-400" />
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <p className="text-sm text-gray-500">
                  请检查档案配置或联系管理员
                </p>
              </div>
            ) : fileExists ? (
              <iframe
                src={fileUrl}
                className="w-full h-full border-0"
                title={fileName}
              />
            ) : (
              <div className="text-center space-y-4 max-w-md">
                <FileQuestion className="h-16 w-16 mx-auto text-gray-400" />
                <Alert>
                  <AlertDescription>
                    该档案没有关联的 PDF 文件
                  </AlertDescription>
                </Alert>
                <p className="text-sm text-gray-500">
                  请先上传 PDF 文件或检查文件路径配置
                </p>
              </div>
            )}
            </div>
          </CardContent>
        </Card>
      ) : (
        fileExists ? (
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={fileName}
          />
        ) : loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
              <p className="text-sm text-gray-500">正在检查 PDF 文件...</p>
            </div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <FileQuestion className="h-16 w-16 mx-auto text-gray-400" />
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <p className="text-sm text-gray-500">
                请检查档案配置或联系管理员
              </p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <FileQuestion className="h-16 w-16 mx-auto text-gray-400" />
              <Alert>
                <AlertDescription>
                  该档案没有关联的 PDF 文件
                </AlertDescription>
              </Alert>
              <p className="text-sm text-gray-500">
                请先上传 PDF 文件或检查文件路径配置
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}

