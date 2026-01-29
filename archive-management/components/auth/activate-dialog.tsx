"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, Loader2 } from "lucide-react";
import { getDeviceCode, activateLicense } from "@/app/(archive)/licenses/actions";
import { useDeviceFingerprint } from "@/hooks/use-device-fingerprint";

interface ActivateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ActivateDialog({ open, onOpenChange, onSuccess }: ActivateDialogProps) {
  const { deviceCode, loading: fingerprintLoading } = useDeviceFingerprint();
  const [authCode, setAuthCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCopy = async () => {
    if (!deviceCode) return;

    try {
      await navigator.clipboard.writeText(deviceCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleActivate = async () => {
    if (!deviceCode || !authCode.trim()) {
      setError("请输入激活码");
      return;
    }

    setActivating(true);
    setError("");

    try {
      const result = await activateLicense(deviceCode, authCode.trim());

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setAuthCode("");
          onOpenChange(false);
          onSuccess?.();
        }, 1500);
      } else {
        setError(result.error || "激活失败");
      }
    } catch (err) {
      setError("激活失败，请重试");
      console.error(err);
    } finally {
      setActivating(false);
    }
  };

  const handleClose = () => {
    if (!activating) {
      setAuthCode("");
      setError("");
      setSuccess(false);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>系统激活</DialogTitle>
          <DialogDescription>
            请复制您的设备码联系管理员获取激活码，然后在此输入激活码完成系统激活。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Device Code */}
          <div className="space-y-2">
            <Label>设备码</Label>
            <div className="flex gap-2">
              <div className="flex-1 font-mono text-sm bg-muted border rounded-md px-3 py-2 flex items-center break-all leading-relaxed">
                {fingerprintLoading ? (
                  <span className="text-muted-foreground">生成中...</span>
                ) : deviceCode ? (
                  <span className="select-all">{deviceCode}</span>
                ) : (
                  <span className="text-muted-foreground">无法生成设备码</span>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopy}
                disabled={!deviceCode || fingerprintLoading}
                className="flex-shrink-0 self-start"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    已复制
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    复制
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Auth Code Input */}
          <div className="space-y-2">
            <Label htmlFor="authCode">激活码</Label>
            <Input
              id="authCode"
              placeholder="请输入激活码"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              disabled={activating || success}
            />
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="border-green-500 text-green-700 bg-green-50">
              <AlertDescription>激活成功！页面将自动刷新...</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={activating || success}
            >
              取消
            </Button>
            <Button
              onClick={handleActivate}
              disabled={!deviceCode || !authCode.trim() || activating || success || fingerprintLoading}
            >
              {activating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  激活中...
                </>
              ) : success ? (
                "已激活"
              ) : (
                "授权"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
