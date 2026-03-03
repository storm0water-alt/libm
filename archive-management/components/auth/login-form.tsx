"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { User, Lock, Eye, EyeOff } from "lucide-react";
import { LicenseStatus } from "@/components/auth/license-status";
import { useDeviceFingerprint } from "@/hooks/use-device-fingerprint";

// 前端日志工具
const LOG_PREFIX = "[Login-Client]";

function log(step: string, message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logMessage = `${LOG_PREFIX}[${timestamp}] ${step}: ${message}`;
  if (data !== undefined) {
    console.log(logMessage, typeof data === 'object' ? JSON.stringify(data, null, 2) : data);
  } else {
    console.log(logMessage);
  }
}

function logError(step: string, message: string, error?: any) {
  const timestamp = new Date().toISOString();
  console.error(`${LOG_PREFIX}[${timestamp}] ${step}: ${message}`, error || '');
}

interface LoginFormProps {
  initialUsername?: string;
}

export function LoginForm({ initialUsername }: LoginFormProps) {
  const router = useRouter();
  const { deviceCode } = useDeviceFingerprint();
  const [username, setUsername] = useState(initialUsername || "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Load username from localStorage on mount
  useEffect(() => {
    if (!initialUsername) {
      const savedUsername = localStorage.getItem("remembered_username");
      if (savedUsername) {
        setUsername(savedUsername);
        setRemember(true);
      }
    }
  }, [initialUsername]);

  // Save username to localStorage when remember is checked
  useEffect(() => {
    if (remember) {
      localStorage.setItem("remembered_username", username);
    } else {
      localStorage.removeItem("remembered_username");
    }
  }, [remember, username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const startTime = Date.now();

    log("START", "用户提交登录表单", {
      username,
      remember,
      hasDeviceCode: !!deviceCode,
      deviceCodeLength: deviceCode?.length || 0
    });

    setError("");
    setIsLoading(true);

    try {
      // 构建表单数据
      log("FORM", "构建表单数据");
      const formData = new FormData();
      formData.append("username", username);
      formData.append("password", password);
      if (remember) {
        formData.append("remember", "on");
      }
      if (deviceCode) {
        formData.append("deviceCode", deviceCode);
      }

      // 调用 Server Action
      log("ACTION", "调用 loginAction Server Action");
      const actionStartTime = Date.now();

      const result = await loginAction(formData);

      const actionDuration = Date.now() - actionStartTime;
      log("ACTION", `Server Action 返回 (耗时: ${actionDuration}ms)`, {
        success: result.success,
        error: result.error,
        redirectTo: result.redirectTo
      });

      if (!result.success) {
        logError("RESULT", "登录失败", result.error);
        setError(result.error || "登录失败");
        if (result.remember !== undefined) {
          setRemember(result.remember);
        }
        setIsLoading(false);
        return;
      }

      // 成功 - 使用完整页面导航确保 cookies 被发送
      if (result.redirectTo) {
        log("REDIRECT", `准备重定向到 ${result.redirectTo}`, {
          method: "window.location.href",
          totalDuration: `${Date.now() - startTime}ms`
        });
        window.location.href = result.redirectTo;
        return;
      }

      log("RESULT", "登录成功但无重定向目标");
      setIsLoading(false);
    } catch (err: any) {
      const actionDuration = Date.now() - startTime;

      // NEXT_REDIRECT 是预期的成功行为
      if (err?.digest?.startsWith("NEXT_REDIRECT")) {
        log("REDIRECT", `NEXT_REDIRECT 捕获 (总耗时: ${actionDuration}ms)`, {
          digest: err.digest
        });
        log("REDIRECT", "准备重定向到 /dashboard");
        window.location.href = "/dashboard";
        return;
      }

      logError("ERROR", `登录异常 (总耗时: ${actionDuration}ms)`, {
        errorName: err?.name,
        errorMessage: err?.message,
        errorDigest: err?.digest
      });

      setError("登录过程中发生错误");
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    router.push("/password-reset");
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="login-form">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 用户名 */}
        <div className="form-item">
          <div className="input-wrapper">
            <User className="input-icon" size={18} />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              disabled={isLoading}
              required
              className="custom-input"
            />
          </div>
        </div>

        {/* 密码 */}
        <div className="form-item">
          <div className="input-wrapper">
            <Lock className="input-icon" size={18} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              disabled={isLoading}
              required
              className="custom-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="password-toggle"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {/* 记住密码和忘记密码 */}
        <div className="login-options">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={remember}
              onCheckedChange={(checked) => setRemember(checked === true)}
              disabled={isLoading}
            />
            <label
              htmlFor="remember"
              className="text-sm font-normal cursor-pointer select-none"
            >
              记住密码
            </label>
          </div>
          <button
            type="button"
            onClick={handleForgotPassword}
            className="text-sm text-purple-600 hover:text-purple-800 font-normal"
            disabled={isLoading}
          >
            忘记密码？
          </button>
        </div>

        {/* 登录按钮 */}
        <Button type="submit" className="w-full login-button" size="lg" disabled={isLoading}>
          {isLoading ? "登录中..." : "登录"}
        </Button>
      </form>

      {/* License Status */}
      <div className="mt-6">
        <LicenseStatus />
      </div>

      <style>{`
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .form-item {
          margin-bottom: 0;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .input-icon {
          position: absolute;
          left: 12px;
          color: #a0aec0;
          pointer-events: none;
          z-index: 1;
        }

        .custom-input {
          width: 100%;
          height: 48px;
          padding: 0 12px 0 40px;
          font-size: 15px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #fff;
          transition: all 0.2s ease;
          outline: none;
        }

        .custom-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .custom-input:disabled {
          background: #f7fafc;
          cursor: not-allowed;
          color: #a0aec0;
        }

        .custom-input.pr-10 {
          padding-right: 40px;
        }

        .password-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #a0aec0;
          cursor: pointer;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s ease;
        }

        .password-toggle:hover {
          color: #667eea;
        }

        .password-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .login-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0;
        }

        .login-button {
          height: 48px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
          font-weight: 600;
          font-size: 16px;
          transition: all 0.2s ease;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .login-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
