"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDate } from "@/lib/utils/date";

interface License {
  id: string;
  name: string;
  deviceCode: string;
  expireTime: Date;
}

interface RenewLicenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  license: License;
  onConfirm: (additionalDays: number) => Promise<void>;
}

export function RenewLicenseDialog({ open, onOpenChange, license, onConfirm }: RenewLicenseDialogProps) {
  const [additionalDays, setAdditionalDays] = useState("365");
  const [renewing, renewingSetRenewing] = useState(false);
  const [error, setError] = useState("");

  const calculateNewExpiry = () => {
    const newDate = new Date(license.expireTime);
    newDate.setDate(newDate.getDate() + parseInt(additionalDays || "0"));
    return newDate;
  };

  const handleConfirm = async () => {
    const days = parseInt(additionalDays);

    if (isNaN(days) || days <= 0) {
      setError("请输入有效的续期天数");
      return;
    }

    renewingSetRenewing(true);
    setError("");

    try {
      await onConfirm(days);
      setAdditionalDays("365");
      onOpenChange(false);
    } catch (err) {
      setError("续期失败，请重试");
      console.error(err);
    } finally {
      renewingSetRenewing(false);
    }
  };

  const handleClose = () => {
    if (!renewing) {
      setAdditionalDays("365");
      setError("");
      onOpenChange(false);
    }
  };

  const newExpiryDate = calculateNewExpiry();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>续期授权</DialogTitle>
          <DialogDescription>
            为授权 <strong>{license.name}</strong> 续期（设备码: {license.deviceCode}）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Expiry */}
          <div className="text-sm text-muted-foreground">
            当前过期时间: {formatDate(new Date(license.expireTime))}
          </div>

          {/* Additional Days Input */}
          <div className="space-y-2">
            <Label htmlFor="additionalDays">续期天数</Label>
            <Input
              id="additionalDays"
              type="number"
              value={additionalDays}
              onChange={(e) => setAdditionalDays(e.target.value)}
              min="1"
              max="3650"
              disabled={renewing}
            />
          </div>

          {/* New Expiry Display */}
          <div className="p-3 bg-muted rounded-md">
            <div className="text-sm">
              续期后过期时间: <span className="font-semibold">{formatDate(newExpiryDate)}</span>
            </div>
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
              disabled={renewing}
            >
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={renewing}
            >
              {renewing ? "续期中..." : "确认续期"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
