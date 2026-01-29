"use client";

import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { createUser, updateUser } from "@/app/(archive)/users/actions";
import { toast } from "sonner";

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialData?: {
    id: string;
    username: string;
    role: string;
    status: string;
  };
  onSuccess?: () => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  mode,
  initialData,
  onSuccess,
}: UserFormDialogProps) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [status, setStatus] = useState<"enabled" | "disabled">("enabled");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Reset form when dialog opens or mode changes
  useEffect(() => {
    if (open) {
      if (mode === "edit" && initialData) {
        setUsername(initialData.username);
        setRole(initialData.role as "admin" | "user");
        setStatus(initialData.status as "enabled" | "disabled");
        setPassword("");
        setConfirmPassword("");
      } else {
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setRole("user");
        setStatus("enabled");
      }
      setError("");
      setUsernameError("");
      setPasswordError("");
    }
  }, [open, mode, initialData]);

  const validateUsername = (value: string) => {
    if (!value) {
      setUsernameError("用户名不能为空");
      return false;
    }
    if (value.length < 3) {
      setUsernameError("用户名至少 3 位");
      return false;
    }
    if (value.length > 50) {
      setUsernameError("用户名最多 50 位");
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError("用户名只能包含字母、数字和下划线");
      return false;
    }
    setUsernameError("");
    return true;
  };

  const validatePassword = (value: string) => {
    if (mode === "create" && !value) {
      setPasswordError("密码不能为空");
      return false;
    }
    if (value && value.length < 8) {
      setPasswordError("密码至少 8 位");
      return false;
    }
    if (value && !/^(?=.*[A-Za-z])(?=.*\d)/.test(value)) {
      setPasswordError("密码必须包含字母和数字");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setError("");

    // Validate username
    if (!validateUsername(username)) {
      return;
    }

    // Validate password for create mode
    if (mode === "create") {
      if (!validatePassword(password)) {
        return;
      }
      if (password !== confirmPassword) {
        setPasswordError("两次密码不一致");
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === "create") {
        await createUser({
          username,
          password,
          role,
        });
        toast.success("用户创建成功");
      } else if (initialData) {
        await updateUser(initialData.id, {
          role,
          status,
        });
        toast.success("用户更新成功");
      }

      onSuccess?.();
      onOpenChange(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const title = mode === "create" ? "新增用户" : "编辑用户";
  const description =
    mode === "create"
      ? "创建新用户账户"
      : "修改用户角色和状态（用户名不可修改）";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-2">
            <Label htmlFor="username">
              用户名 {mode === "edit" && "(不可修改)"}
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => {
                const value = e.target.value;
                setUsername(value);
                if (mode === "create") {
                  validateUsername(value);
                }
              }}
              disabled={mode === "edit" || loading}
              placeholder="输入用户名"
              className={usernameError ? "border-red-500" : ""}
            />
            {usernameError && (
              <p className="text-sm text-red-500">{usernameError}</p>
            )}
          </div>

          {mode === "create" && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="password">
                 密码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPassword(value);
                    validatePassword(value);
                  }}
                  disabled={loading}
                  placeholder="输入密码（至少 8 位，包含字母和数字）"
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
                  placeholder="再次输入密码"
                  className={
                    password !== confirmPassword && confirmPassword
                      ? "border-red-500"
                      : ""
                  }
                />
                {password !== confirmPassword && confirmPassword && (
                  <p className="text-sm text-red-500">两次密码不一致</p>
                )}
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label htmlFor="role">
              角色 <span className="text-red-500">*</span>
            </Label>
            <Select
              value={role}
              onValueChange={(value) => setRole(value as "admin" | "user")}
              disabled={loading}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">普通用户</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "edit" && (
            <div className="grid gap-2">
              <Label htmlFor="status">
                状态 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={status}
                onValueChange={(value) =>
                  setStatus(value as "enabled" | "disabled")
                }
                disabled={loading}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">启用</SelectItem>
                  <SelectItem value="disabled">禁用</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "创建" : "保存"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
