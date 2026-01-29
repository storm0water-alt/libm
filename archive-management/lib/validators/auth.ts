import { z } from "zod";

// Login form validator
export const loginSchema = z.object({
  username: z.string()
    .min(3, "用户名至少 3 个字符")
    .max(50, "用户名最多 50 个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  password: z.string()
    .min(6, "密码至少 6 个字符")
    .max(100, "密码最多 100 个字符"),
  remember: z.boolean().optional(),
});

// Type inference from schema
export type LoginInput = z.infer<typeof loginSchema>;

// Password reset validator
export const passwordResetSchema = z.object({
  username: z.string()
    .min(3, "用户名至少 3 个字符")
    .max(50, "用户名最多 50 个字符"),
  newPassword: z.string()
    .min(6, "密码至少 6 个字符")
    .max(100, "密码最多 100 个字符"),
  confirmPassword: z.string()
    .min(6, "确认密码至少 6 个字符")
    .max(100, "确认密码最多 100 个字符"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "两次输入的密码不一致",
  path: ["confirmPassword"],
});

export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
