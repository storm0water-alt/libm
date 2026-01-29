"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserFormDialog } from "@/components/users/user-form-dialog";
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog";
import { RoleBadge } from "@/components/users/role-badge";
import { StatusBadge } from "@/components/users/status-badge";
import {
  Loader2,
  Plus,
  Search,
  Trash2,
  Power,
  Edit,
  Key,
  MoreVertical,
} from "lucide-react";
import { queryUsers } from "./actions";
import { toast } from "sonner";
import { deleteUser } from "./actions";
import { useLoading } from "@/lib/loading-context";

interface User {
  id: string;
  username: string;
  role: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function UsersPage() {
  const { data: session } = useSession();
  const { setLoading: globalSetLoading } = useLoading();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Batch operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchUsers();
    }
  }, [session, page, search, roleFilter, statusFilter]);

  async function fetchUsers() {
    setLoading(true);
    try {
      const result = await queryUsers({
        page,
        pageSize,
        search: search || undefined,
        role: roleFilter !== "all" ? roleFilter : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });

      setUsers(result.users);
      setTotal(result.total);
    } catch (error: any) {
      toast.error(error.message || "获取用户列表失败");
    } finally {
      setLoading(false);
    }
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(users.map((u) => u.id));
    } else {
      setSelectedIds([]);
    }
  }

  function handleSelectUser(id: string, checked: boolean) {
    if (checked) {
      setSelectedIds([...selectedIds, id]);
    } else {
      setSelectedIds(selectedIds.filter((selectedId) => selectedId !== id));
    }
  }

  function handleCreateUser() {
    setCreateDialogOpen(true);
  }

  function handleEditUser(user: User) {
    setSelectedUser(user);
    setEditDialogOpen(true);
  }

  function handleResetPassword(user: User) {
    setSelectedUser(user);
    setResetPasswordDialogOpen(true);
  }

  async function handleDeleteUser(user: User) {
    if (user.id === session?.user?.id) {
      toast.error("不能删除当前登录用户");
      return;
    }

    if (!confirm(`确定要删除用户 "${user.username}" 吗？`)) {
      return;
    }

    globalSetLoading(true, "正在删除用户...");
    try {
      await deleteUser(user.id);
      toast.success("用户删除成功");
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "删除用户失败");
    } finally {
      globalSetLoading(false);
    }
  }

  async function handleBatchUpdateStatus(status: "enabled" | "disabled") {
    if (selectedIds.length === 0) {
      toast.error("请先选择用户");
      return;
    }

    if (selectedIds.includes(session?.user?.id || "") && status === "disabled") {
      toast.error("不能禁用当前登录用户");
      return;
    }

    setBatchLoading(true);
    globalSetLoading(true, `正在批量${status === "enabled" ? "启用" : "禁用"}用户...`);
    try {
      const { batchUpdateStatus } = await import("./actions");
      const result = await batchUpdateStatus(selectedIds, status);
      toast.success(
        `批量${status === "enabled" ? "启用" : "禁用"}成功：${
          result.successCount
        } 个用户`
      );
      setSelectedIds([]);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "批量操作失败");
    } finally {
      setBatchLoading(false);
      globalSetLoading(false);
    }
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) {
      toast.error("请先选择用户");
      return;
    }

    if (selectedIds.includes(session?.user?.id || "")) {
      toast.error("不能删除当前登录用户");
      return;
    }

    if (
      !confirm(`确定要删除选中的 ${selectedIds.length} 个用户吗？此操作不可撤销。`)
    ) {
      return;
    }

    setBatchLoading(true);
    globalSetLoading(true, "正在批量删除用户...");
    try {
      const { batchDeleteUsers } = await import("./actions");
      const result = await batchDeleteUsers(selectedIds);
      toast.success(
        `批量删除成功：${result.successCount} 个用户`
      );
      setSelectedIds([]);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "批量删除失败");
    } finally {
      setBatchLoading(false);
      globalSetLoading(false);
    }
  }

  function formatLastLoginTime(lastLoginAt: Date | null): string {
    if (!lastLoginAt) return "从未登录";

    const date = new Date(lastLoginAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  function formatCreatedAt(createdAt: Date): string {
    const date = new Date(createdAt);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  const totalPages = Math.ceil(total / pageSize);

  // Check admin permission
  if (session?.user?.role !== "admin" && session?.user?.role !== "管理员") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-md">
          <AlertDescription>
            您没有访问此页面的权限。用户管理功能仅对管理员开放。
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用户权限管理</h1>
          <p className="text-sm text-gray-600 mt-1">管理系统用户和权限</p>
        </div>
        <Button onClick={handleCreateUser}>
          <Plus className="mr-2 h-4 w-4" />
          新增用户
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="搜索用户名..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="角色" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部角色</SelectItem>
                <SelectItem value="admin">管理员</SelectItem>
                <SelectItem value="user">普通用户</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="enabled">启用</SelectItem>
                <SelectItem value="disabled">禁用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Batch Operations */}
      {selectedIds.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-blue-900">
                已选择 <strong>{selectedIds.length}</strong> 个用户
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBatchUpdateStatus("enabled")}
                  disabled={batchLoading}
                >
                  <Power className="mr-2 h-4 w-4" />
                  批量启用
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBatchUpdateStatus("disabled")}
                  disabled={batchLoading}
                >
                  <Power className="mr-2 h-4 w-4" />
                  批量禁用
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleBatchDelete}
                  disabled={batchLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  批量删除
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>用户列表</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-12 text-gray-500">暂无用户</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={
                          selectedIds.length > 0 &&
                          selectedIds.length === users.length
                        }
                        onCheckedChange={(checked) =>
                          handleSelectAll(checked as boolean)
                        }
                      />
                    </TableHead>
                    <TableHead>用户名</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>最后登录</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.includes(user.id)}
                          onCheckedChange={(checked) =>
                            handleSelectUser(user.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.username}
                      </TableCell>
                      <TableCell>
                        <RoleBadge role={user.role} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={user.status} />
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatLastLoginTime(user.lastLoginAt)}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {formatCreatedAt(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleResetPassword(user)}
                            >
                              <Key className="mr-2 h-4 w-4" />
                              重置密码
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600"
                              disabled={user.id === session?.user?.id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600">
                  共 {total} 个用户，第 {page} / {totalPages} 页
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(page - 1)}
                    disabled={page <= 1}
                  >
                    上一页
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={page >= totalPages}
                  >
                    下一页
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <UserFormDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        mode="create"
        onSuccess={() => {
          fetchUsers();
          setCreateDialogOpen(false);
        }}
      />

      {selectedUser && (
        <>
          <UserFormDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            mode="edit"
            initialData={selectedUser}
            onSuccess={() => {
              fetchUsers();
              setEditDialogOpen(false);
              setSelectedUser(null);
            }}
          />
          <ResetPasswordDialog
            open={resetPasswordDialogOpen}
            onOpenChange={setResetPasswordDialogOpen}
            userId={selectedUser.id}
            username={selectedUser.username}
            onSuccess={() => {
              setResetPasswordDialogOpen(false);
              setSelectedUser(null);
            }}
          />
        </>
      )}
    </div>
  );
}
