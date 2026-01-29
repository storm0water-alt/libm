"use server";

import { signIn } from "@/auth";
import { redirect } from "next/navigation";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { authenticateUser } from "@/services/auth.service";
import { licenseService } from "@/services/license.service";

export interface LoginActionResult {
  success: boolean;
  error?: string;
  remember?: boolean;
}

/**
 * Server action for handling login form submission
 * @param formData - Form data from login form
 * @returns LoginActionResult with success status and optional error message
 */
export async function loginAction(formData: FormData): Promise<LoginActionResult> {
  // Extract form data
  const rawData = {
    username: formData.get("username") as string,
    password: formData.get("password") as string,
    remember: formData.get("remember") === "on",
    deviceCode: formData.get("deviceCode") as string,
  };

  // Validate input with Zod schema
  const validationResult = loginSchema.safeParse(rawData);

  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0];
    return {
      success: false,
      error: firstError?.message || "输入数据格式错误",
    };
  }

  const data: LoginInput = validationResult.data;

  // Authenticate user using auth service
  const authResult = await authenticateUser(data.username, data.password);

  if (!authResult.success) {
    return {
      success: false,
      error: authResult.error || "登录失败",
      remember: data.remember,
    };
  }

  // Check license status (skip for admin users - they can access license management)
  if (authResult.user?.role !== "admin") {
    const licenseStatus = await licenseService.checkLicense(rawData.deviceCode);

    if (!licenseStatus.valid) {
      return {
        success: false,
        error: "系统授权已过期，请联系管理员续费",
        remember: data.remember,
      };
    }
  }

  // Sign in with NextAuth - don't redirect here
  await signIn("credentials", {
    username: data.username,
    password: data.password,
    redirect: false,
  });

  // Redirect to dashboard on success
  redirect("/dashboard");
}
