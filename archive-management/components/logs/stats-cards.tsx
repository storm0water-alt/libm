"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LogStats {
  todayCount: number;
  weekCount: number;
  monthCount: number;
  operationDistribution: Record<string, number>;
}

interface StatsCardsProps {
  stats: LogStats;
  onFilterClick?: (operation: string) => void;
}

export function StatsCards({ stats, onFilterClick }: StatsCardsProps) {
  const operationLabels: Record<string, string> = {
    delete: "删除",
    modify: "修改",
    download: "下载",
    import: "入库",
    login: "登录",
    logout: "登出",
    create: "创建",
    view: "查看",
  };

  const operationColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    delete: "destructive",
    modify: "secondary",
    download: "default",
    import: "default",
    login: "outline",
    logout: "outline",
    create: "default",
    view: "secondary",
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Today Count */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            今日操作
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.todayCount}</div>
          <p className="text-xs text-gray-500 mt-1">次操作</p>
        </CardContent>
      </Card>

      {/* Week Count */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            本周操作
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.weekCount}</div>
          <p className="text-xs text-gray-500 mt-1">次操作</p>
        </CardContent>
      </Card>

      {/* Month Count */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            本月操作
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.monthCount}</div>
          <p className="text-xs text-gray-500 mt-1">次操作</p>
        </CardContent>
      </Card>

      {/* Operation Distribution */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">
            操作分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {Object.entries(stats.operationDistribution)
              .filter(([_, count]) => count > 0)
              .sort(([_, a], [__, b]) => b - a)
              .slice(0, 4)
              .map(([operation, count]) => (
                <div
                  key={operation}
                  className="flex items-center justify-between text-sm"
                >
                  <Badge
                    variant={operationColors[operation] || "secondary"}
                    className="cursor-pointer"
                    onClick={() => onFilterClick?.(operation)}
                  >
                    {operationLabels[operation] || operation}
                  </Badge>
                  <span className="text-gray-600">{count}</span>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
