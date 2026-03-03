"use server";

import { signIn } from "@/auth";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { authenticateUser } from "@/services/auth.service";
import { licenseService } from "@/services/license.service";

export interface LoginActionResult {
  success: boolean;
  error?: string;
  remember?: boolean;
  redirectTo?: string;
}

/**
 * Server action for handling login form submission
 */
export async function loginAction(formData: FormData): Promise<LoginActionResult> {
  const rawData = {
    username: formData.get("username") as string,
    password: formData.get("password") as string,
    remember: formData.get("remember") === "on",
    deviceCode: formData.get("deviceCode") as string,
  };

  // Validate input
  const validationResult = loginSchema.safeParse(rawData);
  if (!validationResult.success) {
    const firstError = validationResult.error.issues[0];
    return {
      success: false,
      error: firstError?.message || "输入数据格式错误",
    };
  }

  const data: LoginInput = validationResult.data;

  // Authenticate user
  const authResult = await authenticateUser(data.username, data.password);
  if (!authResult.success) {
    return {
      success: false,
      error: authResult.error || "登录失败",
      remember: data.remember,
    };
  }

  // Check license for non-admin users
  const userRole = authResult.user?.role;
  if (userRole !== "admin") {
    const licenseStatus = await licenseService.checkLicense(rawData.deviceCode);
    if (!licenseStatus.valid) {
      return {
        success: false,
        error: "系统授权已过期，请联系管理员续费",
        remember: data.remember,
      };
    }
  }

  // Sign in with Auth.js
  try {
    await signIn("credentials", {
      username: data.username,
      password: data.password,
      redirectTo: "/dashboard",
    });

    return {
      success: true,
      remember: data.remember,
      redirectTo: "/dashboard",
    };
  } catch (error: any) {
    // NEXT_REDIRECT is expected success behavior
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }

    // Handle AuthError types
    if (error?.name === "AuthError" || error?.type) {
      const errorType = error.type;
      let errorMessage = "登录失败，请重试";

      switch (errorType) {
        case "CredentialsSignin":
          errorMessage = "用户名或密码错误";
          break;
        case "AccessDenied":
          errorMessage = "访问被拒绝";
          break;
      }

      return {
        success: false,
        error: errorMessage,
        remember: data.remember,
      };
    }

    return {
      success: false,
      error: "登录过程中发生错误",
      remember: data.remember,
    };
  }
}
