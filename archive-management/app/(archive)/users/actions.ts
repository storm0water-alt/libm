"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  queryUsers as queryUsersSvc,
  createUser as createUserSvc,
  updateUser as updateUserSvc,
  deleteUser as deleteUserSvc,
  resetPassword as resetPasswordSvc,
  checkUsernameExists,
  batchUpdateStatus as batchUpdateStatusSvc,
  batchDelete as batchDeleteSvc,
  countAdminUsers,
  getUserById,
  type CreateUserInput,
  type UpdateUserInput,
  type UserQueryParams,
} from "@/services/user.service";
import { createLog } from "@/services/log.service";

/**
 * Query users with pagination and filtering
 */
export async function queryUsers(params: UserQueryParams) {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    throw new Error("权限不足");
  }

  return await queryUsersSvc(params);
}

/**
 * Create a new user
 */
export async function createUser(data: CreateUserInput) {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    throw new Error("权限不足");
  }

  // Zod validation
  const schema = z.object({
    username: z
      .string()
      .min(3, "用户名至少 3 位")
      .max(50, "用户名最多 50 位")
      .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
    password: z
      .string()
      .min(8, "密码至少 8 位")
      .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "密码必须包含字母和数字"),
    role: z.enum(["admin", "user"]),
  });

  const validated = schema.parse(data);

  // Check username uniqueness
  const exists = await checkUsernameExists(validated.username);
  if (exists) {
    throw new Error("用户名已存在");
  }

  // Create user
  const user = await createUserSvc(validated);

  // Log operation
  await createLog({
    operator: session.user.username || "unknown",
    operation: "create_user",
    target: `用户: ${user.username}`,
    ip: "",
  });

  // Revalidate cache
  revalidatePath("/users");

  return user;
}

/**
 * Update user
 */
export async function updateUser(id: string, data: UpdateUserInput) {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    throw new Error("权限不足");
  }

  // Don't allow modifying own role
  if (id === session.user.id && data.role) {
    throw new Error("不能修改自己的角色");
  }

  // Don't allow disabling self
  if (id === session.user.id && data.status === "disabled") {
    throw new Error("不能禁用当前登录用户");
  }

  // Check if trying to disable/delete the last admin
  if (data.role || data.status) {
    const user = await getUserById(id);
    if (user?.role === "admin" && (data.role === "user" || data.status === "disabled")) {
      const adminCount = await countAdminUsers();
      if (adminCount <= 1) {
        throw new Error("至少保留一个管理员账户");
      }
    }
  }

  const user = await updateUserSvc(id, data);

  // Log operation
  await createLog({
    operator: session.user.username || "unknown",
    operation: "update_user",
    target: `用户: ${user.username}`,
    ip: "",
  });

  // Revalidate cache
  revalidatePath("/users");

  return user;
}

/**
 * Delete user
 */
export async function deleteUser(id: string) {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    throw new Error("权限不足");
  }

  // Don't allow deleting self
  if (id === session.user.id) {
    throw new Error("不能删除当前登录用户");
  }

  // Check if deleting the last admin
  const user = await getUserById(id);
  if (user?.role === "admin") {
    const adminCount = await countAdminUsers();
    if (adminCount <= 1) {
      throw new Error("至少保留一个管理员账户");
    }
  }

  await deleteUserSvc(id);

  // Log operation
  await createLog({
    operator: session.user.username || "unknown",
    operation: "delete_user",
    target: `用户: ${user?.username}`,
    ip: "",
  });

  // Revalidate cache
  revalidatePath("/users");
}

/**
 * Reset user password
 */
export async function resetPassword(id: string, newPassword: string) {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    throw new Error("权限不足");
  }

  // Validate password strength
  const schema = z
    .string()
    .min(8, "密码至少 8 位")
    .regex(/^(?=.*[A-Za-z])(?=.*\d)/, "密码必须包含字母和数字");

  const validated = schema.parse(newPassword);

  await resetPasswordSvc(id, validated);

  const user = await getUserById(id);

  // Log operation (don't log password)
  await createLog({
    operator: session.user.username || "unknown",
    operation: "reset_password",
    target: `用户: ${user?.username}`,
    ip: "",
  });
}

/**
 * Batch update user status
 */
export async function batchUpdateStatus(
  ids: string[],
  status: "enabled" | "disabled"
) {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    throw new Error("权限不足");
  }

  // Don't allow disabling self
  if (ids.includes(session.user.id) && status === "disabled") {
    throw new Error("不能禁用当前登录用户");
  }

  // Check admin count if disabling admins
  if (status === "disabled") {
    const users = await Promise.all(
      ids.map((id) => getUserById(id))
    );
    const adminCount = users.filter((u) => u?.role === "admin").length;
    if (adminCount > 0) {
      const totalAdminCount = await countAdminUsers();
      if (totalAdminCount <= adminCount) {
        throw new Error("至少保留一个管理员账户");
      }
    }
  }

  const result = await batchUpdateStatusSvc(ids, status);

  // Log operation
  await createLog({
    operator: session.user.username || "unknown",
    operation: "batch_update_status",
    target: `批量更新 ${result.successCount} 个用户状态为 ${status}`,
    ip: "",
  });

  // Revalidate cache
  revalidatePath("/users");

  return result;
}

/**
 * Batch delete users
 */
export async function batchDeleteUsers(ids: string[]) {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    throw new Error("权限不足");
  }

  // Don't allow deleting self
  if (ids.includes(session.user.id)) {
    throw new Error("不能删除当前登录用户");
  }

  // Check admin count
  const users = await Promise.all(ids.map((id) => getUserById(id)));
  const adminUsers = users.filter((u) => u?.role === "admin");

  if (adminUsers.length > 0) {
    const adminCount = await countAdminUsers();
    if (adminCount <= adminUsers.length) {
      throw new Error("至少保留一个管理员账户");
    }
  }

  const result = await batchDeleteSvc(ids);

  // Log operation
  await createLog({
    operator: session.user.username || "unknown",
    operation: "batch_delete_users",
    target: `批量删除 ${result.successCount} 个用户`,
    ip: "",
  });

  // Revalidate cache
  revalidatePath("/users");

  return result;
}
