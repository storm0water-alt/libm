import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";

export interface AuthResult {
  success: boolean;
  user?: {
    id: string;
    username: string;
    role: string;
    status: string;
  };
  error?: string;
}

/**
 * Authenticate user with username and password
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return { success: false, error: "用户名或密码错误" };
    }

    if (user.status === "disabled") {
      return { success: false, error: "账户已被禁用" };
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return { success: false, error: "用户名或密码错误" };
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
      },
    };
  } catch (error) {
    console.error("Auth error:", error);
    return { success: false, error: "认证服务暂时不可用" };
  }
}

/**
 * Verify if a user exists by username
 */
export async function userExists(username: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    return !!user;
  } catch (error) {
    console.error("User exists check error:", error);
    return false;
  }
}
