"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, Loader2 } from "lucide-react";
import { createLicense } from "@/app/(archive)/licenses/actions";

interface CreateLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateLicenseDialog({ open, onOpenChange, onSuccess }: CreateLicenseDialogProps) {
  const [name, setName] = useState("");
  const [deviceCode, setDeviceCode] = useState("");
  const [durationDays, setDurationDays] = useState("365");
  const [creating, setCreating] = useState(false);
  const [createdLicense, setCreatedLicense] = useState<{ name: string; deviceCode: string; authCode: string } | null>(null);
  const [copiedAuth, setCopiedAuth] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!deviceCode.trim() || !durationDays.trim()) {
      setError("请填写所有必填字段");
      return;
    }

    const days = parseInt(durationDays);
    if (isNaN(days) || days <= 0) {
      setError("请输入有效的天数");
      return;
    }

    setCreating(true);
    setError("");

    try {
      const result = await createLicense(deviceCode.trim(), days, name.trim() || undefined);

      if (result.success && result.license) {
        setCreatedLicense({
          name: result.license.name,
          deviceCode: result.license.deviceCode,
          authCode: result.license.authCode,
        });
        onSuccess?.();
      } else {
        setError(result.error || "创建授权失败");
      }
    } catch (err) {
      setError("创建授权失败，请重试");
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleCopyAuthCode = async () => {
    if (!createdLicense?.authCode) return;

    try {
      await navigator.clipboard.writeText(createdLicense.authCode);
      setCopiedAuth(true);
      setTimeout(() => setCopiedAuth(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleClose = () => {
    if (!creating) {
      setName("");
      setDeviceCode("");
      setDurationDays("365");
      setCreatedLicense(null);
      setError("");
      setCopiedAuth(false);
      onOpenChange(false);
    }
  };

  const handleCreateAnother = () => {
    setName("");
    setDeviceCode("");
    setDurationDays("365");
    setCreatedLicense(null);
    setError("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>
            {createdLicense ? "授权创建成功" : "新建授权"}
          </DialogTitle>
          <DialogDescription>
            {createdLicense
              ? "请复制激活码并提供给用户"
              : "为设备创建授权，生成激活码"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!createdLicense ? (
            <>
              {/* Name Input */}
              <div className="space-y-2">
                <Label htmlFor="name">授权名称</Label>
                <Input
                  id="name"
                  placeholder="例如：办公室电脑、财务服务器等"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={creating}
                />
                <p className="text-xs text-muted-foreground">
                  可选，用于记录此授权的用途
                </p>
              </div>

              {/* Device Code Input */}
              <div className="space-y-2">
                <Label htmlFor="deviceCode">设备码 *</Label>
                <Input
                  id="deviceCode"
                  placeholder="输入设备码"
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
                  disabled={creating}
                  className="font-mono"
                />
              </div>

              {/* Duration Days Input */}
              <div className="space-y-2">
                <Label htmlFor="durationDays">激活时长（天）*</Label>
                <Input
                  id="durationDays"
                  type="number"
                  placeholder="365"
                  value={durationDays}
                  onChange={(e) => setDurationDays(e.target.value)}
                  min="1"
                  max="3650"
                  disabled={creating}
                />
              </div>

              {/* Error Message */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={creating}
                >
                  取消
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!deviceCode.trim() || !durationDays.trim() || creating}
                >
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    "创建授权"
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Success Message */}
              <Alert className="border-green-500 text-green-700 bg-green-50">
                <AlertDescription>
                  授权 <strong>{createdLicense.name}</strong> 已成功创建！
                </AlertDescription>
              </Alert>

              {/* Device Code Display */}
              <div className="space-y-2">
                <Label>授权名称</Label>
                <div className="text-sm bg-muted border rounded-md px-3 py-2">
                  {createdLicense.name}
                </div>
              </div>

              {/* Device Code Display */}
              <div className="space-y-2">
                <Label>设备码</Label>
                <div className="font-mono text-sm bg-muted border rounded-md px-3 py-2">
                  {createdLicense.deviceCode}
                </div>
              </div>

              {/* Auth Code Display */}
              <div className="space-y-2">
                <Label>激活码</Label>
                <div className="flex gap-2">
                  <div className="flex-1 font-mono text-sm bg-muted border rounded-md px-3 py-2 select-all break-all leading-relaxed">
                    {createdLicense.authCode}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyAuthCode}
                    className="flex-shrink-0 self-start"
                  >
                    {copiedAuth ? (
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

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={handleClose}
                >
                  关闭
                </Button>
                <Button
                  onClick={handleCreateAnother}
                >
                  创建另一个
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
