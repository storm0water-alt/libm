"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";

interface Archive {
  id: string;
  archiveNo: string | null;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  deptIssue: string | null;
  responsible: string | null;
  docNo: string | null;
  remark: string | null;
  year: number | null;
  fileName: string;
  fileSize: number;
  status: string;
}

export default function EditArchivePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [archive, setArchive] = useState<Archive | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => {
    fetchArchive();
  }, [params.id]);

  const fetchArchive = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/archives/${params.id}`);
      const data = await response.json();

      if (response.ok) {
        setArchive(data);
        setFormData({
          title: data.title || "",
          description: data.description || "",
          category: data.category || "",
          archiveNo: data.archiveNo || "",
          deptIssue: data.deptIssue || "",
          responsible: data.responsible || "",
          docNo: data.docNo || "",
          remark: data.remark || "",
          year: data.year ? data.year.toString() : "",
          tags: data.tags ? data.tags.join(", ") : "",
        });
      } else {
        setError(data.error || "加载档案失败");
      }
    } catch (err) {
      setError("加载档案失败");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title.trim()) {
      setError("请输入档案题名");
      return;
    }

    if (!session?.user?.id) {
      setError("未登录");
      return;
    }

    setSaving(true);

    try {
      const tags = formData.tags
        ? formData.tags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t)
        : [];

      const updateData = {
        title: formData.title,
        description: formData.description || undefined,
        category: formData.category || undefined,
        archiveNo: formData.archiveNo || undefined,
        deptIssue: formData.deptIssue || undefined,
        responsible: formData.responsible || undefined,
        docNo: formData.docNo || undefined,
        remark: formData.remark || undefined,
        year: formData.year ? parseInt(formData.year, 10) : undefined,
        tags,
      };

      const response = await fetch(`/api/archives/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (response.ok) {
        router.push(`/archives/${params.id}`);
      } else {
        setError(data.error || "保存失败");
      }
    } catch (err) {
      console.error("Update error:", err);
      setError("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !archive) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!archive) {
    return (
      <Alert variant="destructive">
        <AlertDescription>档案不存在</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          ← 返回
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">编辑档案</h1>
          <p className="text-sm text-gray-600 mt-1">
            修改档案信息和元数据
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current File Info */}
      <Card>
        <CardHeader>
          <CardTitle>当前文件</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <span className="font-medium">文件名：</span>
              {archive.fileName}
            </p>
            <p>
              <span className="font-medium">文件大小：</span>
              {(archive.fileSize / 1024 / 1024).toFixed(2)} MB
            </p>
            <p className="text-xs text-gray-500 mt-2">
              注：当前版本暂不支持替换文件，请删除后重新上传
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
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
                  disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
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
                  disabled={saving}
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
            disabled={saving}
          >
            取消
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              "保存更改"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
