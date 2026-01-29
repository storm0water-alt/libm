"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Copy, Check, Loader2 } from "lucide-react";
import { RenewLicenseDialog } from "./renew-license-dialog";

interface License {
  id: string;
  name: string;
  deviceCode: string;
  authCode: string;
  expireTime: Date;
  isActive: boolean;
  createdAt: Date;
}

interface LicenseTableProps {
  licenses: License[];
  onRenew?: (licenseId: string, additionalDays: number) => Promise<void>;
  onDelete?: (licenseId: string) => Promise<void>;
  loading?: boolean;
}

export function LicenseTable({ licenses, onRenew, onDelete, loading }: LicenseTableProps) {
  const [copiedDevice, setCopiedDevice] = useState<string | null>(null);
  const [copiedAuth, setCopiedAuth] = useState<string | null>(null);
  const [renewing, setRenewing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [showRenewDialog, setShowRenewDialog] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);

  const handleCopy = async (text: string, type: "device" | "auth") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "device") {
        setCopiedDevice(text);
        setTimeout(() => setCopiedDevice(null), 2000);
      } else {
        setCopiedAuth(text);
        setTimeout(() => setCopiedAuth(null), 2000);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleRenewClick = (license: License) => {
    setSelectedLicense(license);
    setShowRenewDialog(true);
  };

  const handleRenewConfirm = async (additionalDays: number) => {
    if (!selectedLicense || !onRenew) return;

    setRenewing(selectedLicense.id);
    try {
      await onRenew(selectedLicense.id, additionalDays);
      setShowRenewDialog(false);
      setSelectedLicense(null);
    } finally {
      setRenewing(null);
    }
  };

  const handleDelete = async (licenseId: string) => {
    if (!onDelete) return;

    if (!confirm("确定要删除此授权吗？删除后设备将无法继续使用系统。")) {
      return;
    }

    setDeleting(licenseId);
    try {
      await onDelete(licenseId);
    } finally {
      setDeleting(null);
    }
  };

  if (licenses.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        暂无授权记录
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>设备码</TableHead>
            <TableHead>激活码</TableHead>
            <TableHead>过期时间</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {licenses.map((license) => (
            <TableRow key={license.id}>
              <TableCell className="font-medium">
                {license.name}
              </TableCell>
              <TableCell className="font-mono text-sm max-w-[200px] whitespace-normal">
                <div className="flex items-start gap-2">
                  <span className="select-all break-all leading-relaxed">{license.deviceCode}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 flex-shrink-0 mt-0.5"
                    onClick={() => handleCopy(license.deviceCode, "device")}
                  >
                    {copiedDevice === license.deviceCode ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </TableCell>
              <TableCell className="font-mono text-sm max-w-[300px] whitespace-normal">
                <div className="flex items-start gap-2">
                  <span className="select-all break-all leading-relaxed">{license.authCode}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 flex-shrink-0 mt-0.5"
                    onClick={() => handleCopy(license.authCode, "auth")}
                  >
                    {copiedAuth === license.authCode ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                {formatDate(new Date(license.expireTime))}
              </TableCell>
              <TableCell>
                <Badge variant={license.isActive ? "default" : "destructive"}>
                  {license.isActive ? "有效" : "已过期"}
                </Badge>
              </TableCell>
              <TableCell>
                {formatDate(new Date(license.createdAt))}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {onRenew && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRenewClick(license)}
                      disabled={renewing === license.id || deleting === license.id || loading}
                    >
                      {renewing === license.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "续期"
                      )}
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(license.id)}
                      disabled={renewing === license.id || deleting === license.id || loading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      {deleting === license.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "删除"
                      )}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedLicense && (
        <RenewLicenseDialog
          open={showRenewDialog}
          onOpenChange={setShowRenewDialog}
          license={selectedLicense}
          onConfirm={handleRenewConfirm}
        />
      )}
    </>
  );
}
