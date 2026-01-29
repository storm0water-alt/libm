"use server";

import { redirect } from "next/navigation";
import { hash } from "bcrypt";
import { prisma } from "@/lib/prisma";
import { passwordResetSchema } from "@/lib/validators/auth";

export interface PasswordResetResult {
  success: boolean;
  error?: string;
}

/**
 * Server action for handling password reset
 * @param formData - Form data from password reset form
 * @returns PasswordResetResult with success status and optional error message
 */
export async function resetPasswordAction(formData: FormData): Promise<PasswordResetResult> {
  // Extract form data
  const rawData = {
    username: formData.get("username") as string,
    newPassword: formData.get("newPassword") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  // Validate input with Zod schema
  const validationResult = passwordResetSchema.safeParse(rawData);

  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0];
    return {
      success: false,
      error: firstError?.message || "输入数据格式错误",
    };
  }

  const data = validationResult.data;

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { username: data.username },
  });

  if (!user) {
    return {
      success: false,
      error: "用户不存在",
    };
  }

  // Hash new password with bcrypt
  const hashedPassword = await hash(data.newPassword, 10);

  // Update password in database
  try {
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // TODO: Log password reset operation
    console.log(`Password reset for user: ${data.username}`);

    return {
      success: true,
    };
  } catch (error) {
    console.error("Password reset error:", error);
    return {
      success: false,
      error: "密码重置失败",
    };
  }
}
