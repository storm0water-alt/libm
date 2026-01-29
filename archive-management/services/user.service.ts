import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";

/**
 * User service - exports individual functions for user management
 * All functions are exported individually, not as a userService object
 */

/**
 * User query parameters
 */
export interface UserQueryParams {
  page: number;
  pageSize: number;
  search?: string; // Search by username
  role?: string; // Filter by role
  status?: string; // Filter by status
}

/**
 * User list response
 */
export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * User type (without password)
 */
export interface User {
  id: string;
  username: string;
  role: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create user input
 */
export interface CreateUserInput {
  username: string;
  password: string;
  role: "admin" | "user";
}

/**
 * Update user input
 */
export interface UpdateUserInput {
  role?: "admin" | "user";
  status?: "enabled" | "disabled";
}

/**
 * Batch update result
 */
export interface BatchUpdateResult {
  successCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Batch delete result
 */
export interface BatchDeleteResult {
  successCount: number;
  failedCount: number;
  errors: string[];
}

/**
 * Query users with pagination and filtering
 */
export async function queryUsers(
  params: UserQueryParams
): Promise<UserListResponse> {
  const { page = 1, pageSize = 10, search, role, status } = params;

  const skip = (page - 1) * pageSize;

  // Build where clause
  const where: any = {};

  if (search) {
    where.OR = [
      { username: { contains: search, mode: "insensitive" } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  // Get total count
  const total = await prisma.user.count({ where });

  // Get users
  const users = await prisma.user.findMany({
    where,
    skip,
    take: pageSize,
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return {
    users,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Get user by username
 */
export async function getUserByUsername(
  username: string
): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Create a new user
 */
export async function createUser(data: CreateUserInput): Promise<User> {
  // Hash password
  const hashedPassword = await hashPassword(data.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      username: data.username,
      password: hashedPassword,
      role: data.role,
    },
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Update user
 */
export async function updateUser(
  id: string,
  data: UpdateUserInput
): Promise<User> {
  const user = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Delete user
 */
export async function deleteUser(id: string): Promise<void> {
  await prisma.user.delete({
    where: { id },
  });
}

/**
 * Reset user password
 */
export async function resetPassword(
  id: string,
  newPassword: string
): Promise<void> {
  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
    },
  });
}

/**
 * Check if username exists (optionally exclude a specific user ID)
 */
export async function checkUsernameExists(
  username: string,
  excludeId?: string
): Promise<boolean> {
  const where: any = { username };

  if (excludeId) {
    where.NOT = { id: excludeId };
  }

  const count = await prisma.user.count({ where });
  return count > 0;
}

/**
 * Batch update user status
 */
export async function batchUpdateStatus(
  ids: string[],
  status: "enabled" | "disabled"
): Promise<BatchUpdateResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    try {
      await prisma.user.update({
        where: { id },
        data: { status },
      });
      successCount++;
    } catch (error) {
      errors.push(`Failed to update user ${id}: ${error}`);
    }
  }

  return {
    successCount,
    failedCount: errors.length,
    errors,
  };
}

/**
 * Batch delete users
 */
export async function batchDelete(ids: string[]): Promise<BatchDeleteResult> {
  const errors: string[] = [];
  let successCount = 0;

  for (const id of ids) {
    try {
      await prisma.user.delete({
        where: { id },
      });
      successCount++;
    } catch (error) {
      errors.push(`Failed to delete user ${id}: ${error}`);
    }
  }

  return {
    successCount,
    failedCount: errors.length,
    errors,
  };
}

/**
 * Count admin users
 */
export async function countAdminUsers(): Promise<number> {
  return await prisma.user.count({
    where: {
      role: "admin",
      status: "enabled",
    },
  });
}

/**
 * Update last login time
 */
export async function updateLastLoginTime(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
    },
  });
}
