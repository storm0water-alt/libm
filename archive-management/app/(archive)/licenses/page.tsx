"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LicenseTable } from "@/components/licenses/license-table";
import { CreateLicenseDialog } from "@/components/licenses/create-license-dialog";
import { renewLicense, deleteLicense, getAllLicenses } from "@/app/(archive)/licenses/actions";
import { toast } from "sonner";
import { useLoading } from "@/lib/loading-context";

interface License {
  id: string;
  name: string;
  deviceCode: string;
  authCode: string;
  expireTime: Date;
  createdAt: Date;
  isActive: boolean;
}

export default function LicensesPage() {
  const { data: session, status } = useSession();
  const { setLoading: globalSetLoading } = useLoading();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      checkAdminAndFetchLicenses();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status]);

  async function checkAdminAndFetchLicenses() {
    console.log("[Licenses] Session:", session);
    console.log("[Licenses] User role:", session?.user?.role);

    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "管理员")) {
      console.log("[Licenses] Permission denied");
      setLoading(false);
      return;
    }
    fetchLicenses();
  }

  async function fetchLicenses() {
    setLoading(true);
    try {
      const result = await getAllLicenses();

      if (result.success && result.licenses) {
        setLicenses(result.licenses.map((license: any) => ({
          ...license,
          expireTime: new Date(license.expireTime),
          createdAt: new Date(license.createdAt),
        })));
      }
    } catch (error) {
      console.error("Failed to fetch licenses:", error);
      toast.error("获取授权列表失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleRenew(licenseId: string, additionalDays: number) {
    globalSetLoading(true, "正在续期授权...");
    try {
      const result = await renewLicense(licenseId, additionalDays);

      if (result.success) {
        toast.success("授权续期成功");
        fetchLicenses();
      } else {
        toast.error(result.error || "续期失败");
      }
    } catch (error) {
      console.error("Failed to renew license:", error);
      toast.error("续期失败");
    } finally {
      globalSetLoading(false);
    }
  }

  async function handleDelete(licenseId: string) {
    if (!confirm("确定要删除这个授权吗？")) return;

    globalSetLoading(true, "正在删除授权...");
    try {
      const result = await deleteLicense(licenseId);

      if (result.success) {
        toast.success("授权删除成功");
        fetchLicenses();
      } else {
        toast.error(result.error || "删除失败");
      }
    } catch (error) {
      console.error("Failed to delete license:", error);
      toast.error("删除失败");
    } finally {
      globalSetLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (!session?.user || (session.user.role !== "admin" && session.user.role !== "管理员")) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert className="max-w-md">
          <AlertDescription>
            您没有访问此页面的权限。授权管理功能仅对管理员开放。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">授权管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            管理系统授权和设备许可证
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          新建授权
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertDescription>
          <strong>授权说明：</strong>设备需要授权才能使用系统。
          每个授权绑定一个设备码，授权到期后需要续期或重新激活。
        </AlertDescription>
      </Alert>

      {/* Licenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>授权列表</CardTitle>
        </CardHeader>
        <CardContent>
          <LicenseTable
            licenses={licenses}
            onRenew={handleRenew}
            onDelete={handleDelete}
            loading={loading}
          />
        </CardContent>
      </Card>

      {/* Create License Dialog */}
      <CreateLicenseDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={fetchLicenses}
      />
    </div>
  );
}
