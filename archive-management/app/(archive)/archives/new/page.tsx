"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Upload } from "lucide-react";
import { useSession } from "next-auth/react";

export default function NewArchivePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    archiveNo: "",
    deptIssue: "",
    responsible: "",
    docNo: "",
    remark: "",
    year: "",
    tags: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setError("仅支持 PDF 文件");
        return;
      }
      if (selectedFile.size > 50 * 1024 * 1024) {
        setError("文件大小不能超过 50MB");
        return;
      }
      setFile(selectedFile);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!file) {
      setError("请选择 PDF 文件");
      return;
    }

    if (!formData.title.trim()) {
      setError("请输入档案题名");
      return;
    }

    if (!session?.user?.id) {
      setError("未登录");
      return;
    }

    setLoading(true);
    setUploadProgress(0);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("file", file);
      formDataToSend.append("userId", session.user.id);
      formDataToSend.append("title", formData.title);
      if (formData.description)
        formDataToSend.append("description", formData.description);
      if (formData.category)
        formDataToSend.append("category", formData.category);
      if (formData.archiveNo)
        formDataToSend.append("archiveNo", formData.archiveNo);
      if (formData.deptIssue)
        formDataToSend.append("deptIssue", formData.deptIssue);
      if (formData.responsible)
        formDataToSend.append("responsible", formData.responsible);
      if (formData.docNo)
        formDataToSend.append("docNo", formData.docNo);
      if (formData.remark)
        formDataToSend.append("remark", formData.remark);
      if (formData.year)
        formDataToSend.append("year", formData.year);
      if (formData.tags)
        formDataToSend.append("tags", JSON.stringify(formData.tags.split(",").map(t => t.trim()).filter(t => t)));

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formDataToSend,
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/archives/${data.archive.id}`);
      } else {
        setError(data.error || "上传失败");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setError("上传失败，请重试");
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          ← 返回
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">新建档案</h1>
          <p className="text-sm text-gray-600 mt-1">
            上传 PDF 文件并填写档案信息
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>文件上传</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="file">PDF 文件 *</Label>
                <div className="mt-2">
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    支持 PDF 格式，最大 50MB
                  </p>
                </div>
                {file && (
                  <div className="mt-2 text-sm text-gray-600">
                    已选择: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="title">
                  题名 * <span className="text-red-500"></span>
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="请输入档案题名"
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="archiveNo">档号</Label>
                <Input
                  id="archiveNo"
                  name="archiveNo"
                  value={formData.archiveNo}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="例如：2024-GZ-001"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="category">分类</Label>
                <Input
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="例如：工作总结"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="deptIssue">机构问题</Label>
                <Input
                  id="deptIssue"
                  name="deptIssue"
                  value={formData.deptIssue}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="例如：办公室"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="responsible">责任者</Label>
                <Input
                  id="responsible"
                  name="responsible"
                  value={formData.responsible}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="例如：张三"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="docNo">文号</Label>
                <Input
                  id="docNo"
                  name="docNo"
                  value={formData.docNo}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="例如：文号〔2024〕1号"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="year">年度</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  value={formData.year}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="例如：2024"
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="tags">标签</Label>
                <Input
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="用逗号分隔，例如：2024,年度,总结"
                  className="mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">描述</Label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="请输入档案描述"
                  rows={3}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="remark">备注</Label>
                <textarea
                  id="remark"
                  name="remark"
                  value={formData.remark}
                  onChange={handleInputChange}
                  disabled={loading}
                  placeholder="请输入备注信息"
                  rows={2}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={loading}
          >
            取消
          </Button>
          <Button type="submit" disabled={loading || !file}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                上传中...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                上传档案
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
