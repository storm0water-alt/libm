import { prisma } from "@/lib/prisma";
import { compare } from "bcrypt";

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
 * @param username - User's username
 * @param password - User's plain text password
 * @returns AuthResult with success status, user data (if success), or error message
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<AuthResult> {
  try {
    // Find user by username
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

    // Consistent error message - don't reveal if user exists
    if (!user) {
      return {
        success: false,
        error: "用户名或密码错误",
      };
    }

    // Check if user account is disabled
    if (user.status === "disabled") {
      return {
        success: false,
        error: "账户已被禁用",
      };
    }

    // Compare password with bcrypt hash
    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      return {
        success: false,
        error: "用户名或密码错误",
      };
    }

    // Update last login time
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    // Return user data without password
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
    console.error("Authentication error:", error);
    return {
      success: false,
      error: "认证服务暂时不可用",
    };
  }
}

/**
 * Verify if a user exists by username
 * Used for password reset flow
 * @param username - User's username
 * @returns true if user exists, false otherwise
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
