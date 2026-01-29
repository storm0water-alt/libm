"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const errorMessages: Record<string, { title: string; description: string; icon: React.ReactNode }> = {
  license_expired: {
    title: "授权已过期",
    description: "您的系统授权已过期，请联系管理员续费。",
    icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
  },
  permission_denied: {
    title: "权限不足",
    description: "抱歉，您没有权限访问该页面。如需帮助，请联系管理员。",
    icon: <AlertTriangle className="h-12 w-12 text-yellow-500" />,
  },
  authentication_required: {
    title: "需要登录",
    description: "请先登录后访问该页面。",
    icon: <AlertTriangle className="h-12 w-12 text-blue-500" />,
  },
  page_not_found: {
    title: "页面不存在",
    description: "抱歉，您访问的页面不存在。",
    icon: <AlertTriangle className="h-12 w-12 text-gray-500" />,
  },
  server_error: {
    title: "服务器错误",
    description: "抱歉，服务器出错了。请稍后重试。",
    icon: <AlertTriangle className="h-12 w-12 text-red-500" />,
  },
  default: {
    title: "出错了",
    description: "抱歉，发生了错误。请稍后重试。",
    icon: <AlertTriangle className="h-12 w-12 text-gray-500" />,
  },
};

function ErrorPageContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") || "default";
  const from = searchParams.get("from") || "/";

  const errorInfo = errorMessages[error] || errorMessages.default;

  const handleGoBack = () => {
    window.location.href = from;
  };

  const handleGoHome = () => {
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            {/* Icon */}
            <div className="flex justify-center">{errorInfo.icon}</div>

            {/* Title */}
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                {errorInfo.title}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">{errorInfo.description}</p>
            </div>

            {/* Error code (for debugging) */}
            {error !== "default" && (
              <div className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded">
                错误代码: {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleGoBack}
                className="flex-1"
              >
                返回上页
              </Button>
              <Button
                onClick={handleGoHome}
                className="flex-1"
              >
                <Home className="mr-2 h-4 w-4" />
                返回首页
              </Button>
            </div>

            {/* Additional Help */}
            <div className="text-xs text-gray-500 text-center">
              需要帮助？
              {error === "permission_denied" && (
                <span>请联系您的系统管理员获取相应权限</span>
              )}
              {error === "authentication_required" && (
                <Link href="/login" className="text-blue-600 hover:underline">
                  前往登录
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            <div className="flex justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <ErrorPageContent />
    </Suspense>
  );
}
