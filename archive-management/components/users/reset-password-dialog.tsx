"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { resetPassword } from "@/app/(archive)/users/actions";
import { toast } from "sonner";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  onSuccess?: () => void;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  username,
  onSuccess,
}: ResetPasswordDialogProps) {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const resetForm = () => {
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setPasswordError("");
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("密码不能为空");
      return false;
    }
    if (value.length < 8) {
      setPasswordError("密码至少 8 位");
      return false;
    }
    if (!/^(?=.*[A-Za-z])(?=.*\d)/.test(value)) {
      setPasswordError("密码必须包含字母和数字");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setError("");

    // Validate password
    if (!validatePassword(newPassword)) {
      return;
    }

    // Check password match
    if (newPassword !== confirmPassword) {
      setPasswordError("两次密码不一致");
      return;
    }

    setLoading(true);

    try {
      await resetPassword(userId, newPassword);
      toast.success("密码重置成功");
      resetForm();
      onSuccess?.();
      onOpenChange(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "密码重置失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>重置密码</DialogTitle>
          <DialogDescription>
            为用户 <strong>{username}</strong> 重置密码
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="newPassword">
              新密码 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => {
                const value = e.target.value;
                setNewPassword(value);
                validatePassword(value);
              }}
              disabled={loading}
              placeholder="输入新密码（至少 8 位，包含字母和数字）"
              className={passwordError ? "border-red-500" : ""}
            />
            {passwordError && (
              <p className="text-sm text-red-500">{passwordError}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">
              确认密码 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="再次输入新密码"
              className={
                newPassword !== confirmPassword && confirmPassword
                  ? "border-red-500"
                  : ""
              }
            />
            {newPassword !== confirmPassword && confirmPassword && (
              <p className="text-sm text-red-500">两次密码不一致</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            重置密码
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
