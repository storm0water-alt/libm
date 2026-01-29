"use client";

import { Badge } from "@/components/ui/badge";

interface OperationBadgeProps {
  operation: string;
}

export function OperationBadge({ operation }: OperationBadgeProps) {
  const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    delete: "destructive",
    modify: "secondary",
    download: "default",
    import: "default",
    login: "outline",
    logout: "outline",
    create: "default",
    view: "secondary",
  };

  const labels: Record<string, string> = {
    delete: "删除",
    modify: "修改",
    download: "下载",
    import: "入库",
    login: "登录",
    logout: "登出",
    create: "创建",
    view: "查看",
  };

  return (
    <Badge variant={colors[operation] || "secondary"}>
      {labels[operation] || operation}
    </Badge>
  );
}
