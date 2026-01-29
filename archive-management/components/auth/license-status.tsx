"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils/date";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeviceFingerprint } from "@/hooks/use-device-fingerprint";
import { Copy, Check, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { checkLicenseStatus } from "@/app/(archive)/licenses/actions";
import { ActivateDialog } from "./activate-dialog";

export interface LicenseStatusProps {
  onActivateSuccess?: () => void;
}

export function LicenseStatus({ onActivateSuccess }: LicenseStatusProps) {
  const { deviceCode, loading } = useDeviceFingerprint();
  const [copied, setCopied] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<{
    valid: boolean;
    expireTime?: Date;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const isExpired = licenseStatus?.expireTime
    ? new Date(licenseStatus.expireTime) < new Date()
    : true;

  // 自动展开条件：过期或未激活
  const shouldAutoExpand = isExpired || !licenseStatus?.expireTime;

  async function loadLicenseStatus() {
    setStatusLoading(true);
    try {
      const result = await checkLicenseStatus(deviceCode || undefined);
      if (result.success) {
        setLicenseStatus({
          valid: result.valid,
          expireTime: result.expireTime ? new Date(result.expireTime) : undefined,
        });
      }
    } catch (error) {
      console.error("Failed to load license status:", error);
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    loadLicenseStatus();
  }, [deviceCode]);

  // 自动展开当需要激活或已过期时
  useEffect(() => {
    if (!statusLoading && shouldAutoExpand) {
      setIsExpanded(true);
    }
  }, [statusLoading, shouldAutoExpand]);

  const handleCopyDeviceCode = async () => {
    if (!deviceCode) return;

    try {
      await navigator.clipboard.writeText(deviceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy device code:", err);
    }
  };

  const handleActivateSuccess = () => {
    loadLicenseStatus();
    onActivateSuccess?.();
  };

  return (
    <>
      <div className="mt-6 space-y-4">
        {/* 折叠/展开按钮 */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-sm text-muted-foreground hover:text-foreground transition-colors p-2 rounded hover:bg-muted/50"
        >
          <span>授权信息</span>
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* 展开的内容 */}
        {isExpanded && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Device Code */}
            <div className="p-4 bg-muted/50 border rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">设备码</span>
                {deviceCode && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyDeviceCode}
                    className="h-7 px-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        已复制
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        复制
                      </>
                    )}
                  </Button>
                )}
              </div>
              {loading ? (
                <div className="text-sm text-muted-foreground">生成中...</div>
              ) : deviceCode ? (
                <div className="font-mono text-sm bg-background border rounded px-3 py-2 select-all">
                  {deviceCode}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">无法生成设备码</div>
              )}
            </div>

            {/* License Status */}
            <div className="p-4 bg-muted/50 border rounded-md">
              {statusLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">授权有效期至:</span>
                      {licenseStatus?.expireTime ? (
                        <span className={`text-sm font-medium ${isExpired ? "text-destructive" : ""}`}>
                          {formatDate(new Date(licenseStatus.expireTime))}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">未激活</span>
                      )}
                    </div>

                    {isExpired && (
                      <Button
                        onClick={() => setShowActivateDialog(true)}
                        size="sm"
                        variant="destructive"
                      >
                        激活
                      </Button>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="mt-2">
                    <Badge variant={isExpired ? "destructive" : licenseStatus?.expireTime ? "default" : "secondary"}>
                      {isExpired ? "已过期" : licenseStatus?.expireTime ? "有效" : "未激活"}
                    </Badge>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <ActivateDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        onSuccess={handleActivateSuccess}
      />
    </>
  );
}
