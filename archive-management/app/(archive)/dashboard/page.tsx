"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  FileText,
  Upload,
  Search,
  List,
  Users,
  Settings,
  TrendingUp,
  TrendingDown,
  Clock,
  BarChart3,
  Activity,
  Plus,
  ChevronRight,
} from "lucide-react";

interface Stats {
  totalArchives: number;
  todayOperations: number;
  activeUsers: number;
  archiveTrend: number;
  operationTrend: number;
  userTrend: number;
  licenseStatus: {
    valid: boolean;
    expireTime: string | null;
  };
}

interface QuickAction {
  title: string;
  icon: React.ReactNode;
  color: "primary" | "success" | "warning" | "info";
  path: string;
}

interface RecentItem {
  id: string;
  title: string;
  meta: string;
  time: string;
}

interface DistributionItem {
  name: string;
  value: number;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
    totalArchives: 0,
    todayOperations: 0,
    activeUsers: 0,
    archiveTrend: 12.5,
    operationTrend: 8.7,
    userTrend: 5.2,
    licenseStatus: {
      valid: true,
      expireTime: null,
    },
  });
  const [loading, setLoading] = useState(true);
  const [recentArchives, setRecentArchives] = useState<RecentItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<RecentItem[]>([]);
  const [retentionDistribution, setRetentionDistribution] = useState<DistributionItem[]>([]);

  const quickActions: QuickAction[] = [
    {
      title: "文件入库",
      icon: <Upload size={24} />,
      color: "success",
      path: "/import",
    },
    {
      title: "档案查询",
      icon: <Search size={24} />,
      color: "warning",
      path: "/search",
    },
    {
      title: "操作日志",
      icon: <List size={24} />,
      color: "info",
      path: "/logs",
    },
  ];

  useEffect(() => {
    if (status === "authenticated") {
      fetchDashboardData();
    }
  }, [status]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // Fetch stats
      const statsResponse = await fetch("/api/dashboard/stats");
      console.log("[Dashboard] Stats response status:", statsResponse.status);

      if (statsResponse.ok) {
        const data = await statsResponse.json();
        console.log("[Dashboard] Stats data received:", data);

        setStats({
          totalArchives: data.totalArchives || 0,
          todayOperations: data.todayOperations || 0,
          activeUsers: data.activeUsers || 0,
          archiveTrend: 12.5,
          operationTrend: 8.7,
          userTrend: 5.2,
          licenseStatus: data.licenseStatus || {
            valid: true,
            expireTime: null,
          },
        });

        // Set real recent archives data
        setRecentArchives(data.recentArchives || []);

        // Set real recent logs data
        setRecentLogs(data.recentLogs || []);

        // Set retention distribution data
        if (data.retentionDistribution && data.retentionDistribution.length > 0) {
          setRetentionDistribution(data.retentionDistribution);
        }
      } else {
        console.error("[Dashboard] Stats response error:", await statsResponse.text());
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleQuickAction = (action: QuickAction) => {
    router.push(action.path);
  };

  const getGradientColor = (color: string) => {
    const colors = {
      primary: "linear-gradient(135deg, #667eea, #764ba2)",
      success: "linear-gradient(135deg, #48bb78, #38a169)",
      warning: "linear-gradient(135deg, #ecc94b, #d69e2e)",
      info: "linear-gradient(135deg, #4fd1c5, #38b2ac)",
    };
    return colors[color as keyof typeof colors] || colors.primary;
  };

  const formatDate = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}年${month}月${day}日`;
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* 欢迎卡片 */}
      <div className="welcome-section">
        <Card className="welcome-card">
          <CardContent className="welcome-content">
            <div className="welcome-info">
              <h2 className="welcome-title">
                欢迎回来，{session?.user?.username || "用户"}！
              </h2>
              <p className="welcome-subtitle">
                今天是 {formatDate()}，祝您工作愉快！
              </p>
            </div>
            <div className="welcome-actions">
              <Button
                type="button"
                onClick={() => handleQuickAction(quickActions[0])}
              >
                <Upload className="mr-2 h-4 w-4" />
                文件入库
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 统计卡片 */}
      <div className="stats-section">
        <div className="stats-grid">
          <StatCard
            title="档案总数"
            value={stats.totalArchives.toLocaleString()}
            icon={<FileText size={24} />}
            color="primary"
            trend={stats.archiveTrend}
            loading={loading}
          />
          <StatCard
            title="今日操作次数"
            value={stats.todayOperations.toString()}
            icon={<Activity size={24} />}
            color="success"
            trend={stats.operationTrend}
            loading={loading}
          />
          <StatCard
            title="活跃用户数"
            value={stats.activeUsers.toString()}
            icon={<Users size={24} />}
            color="info"
            trend={stats.userTrend}
            loading={loading}
          />
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="main-content">
        <div className="content-left">
          {/* 快捷操作 */}
          <Card className="quick-actions-card">
            <CardHeader>
              <div className="card-header">
                <h3>快捷操作</h3>
                <Button variant="link" className="text-purple-600">
                  更多
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="quick-actions-grid">
                {quickActions.map((action) => (
                  <div
                    key={action.title}
                    className={`quick-action-item quick-action-${action.color}`}
                    onClick={() => handleQuickAction(action)}
                  >
                    {action.icon}
                    <span>{action.title}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 最近档案 */}
          <Card className="recent-archives-card">
            <CardHeader>
              <div className="card-header">
                <h3>最近档案</h3>
                <Button
                  variant="link"
                  className="text-purple-600"
                  asChild
                >
                  <Link href="/archives">查看全部</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentArchives.length > 0 ? (
                <div className="recent-list">
                  {recentArchives.map((archive) => (
                    <div
                      key={archive.id}
                      className="recent-item"
                      onClick={() => router.push(`/archives/${archive.id}`)}
                    >
                      <div className="item-info">
                        <div className="item-title">{archive.title}</div>
                        <div className="item-meta">
                          <span className="item-id">{archive.meta}</span>
                          <span className="item-time">{archive.time}</span>
                        </div>
                      </div>
                      <FileText className="item-icon" size={16} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">暂无数据</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="content-right">
          {/* 档案类型分布 */}
          <Card className="chart-card">
            <CardHeader>
              <h3>保管期限分布</h3>
            </CardHeader>
            <CardContent>
              <div className="chart-container">
                {retentionDistribution.length > 0 ? (
                  <div className="type-distribution">
                    {retentionDistribution.map((item, index) => {
                      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#6b7280"];
                      const color = colors[index % colors.length];
                      return (
                        <div key={item.name} className="type-item">
                          <div className="type-color" style={{ backgroundColor: color }}></div>
                          <span className="type-name">{item.name}</span>
                          <span className="type-value">{item.value}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">暂无数据</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 最近操作 */}
          <Card className="recent-logs-card">
            <CardHeader>
              <div className="card-header">
                <h3>最近操作</h3>
                <Button
                  variant="link"
                  className="text-purple-600"
                  asChild
                >
                  <Link href="/logs">查看全部</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentLogs.length > 0 ? (
                <div className="recent-list">
                  {recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="recent-item"
                      onClick={() => router.push("/logs")}
                    >
                      <div className="item-info">
                        <div className="item-title">{log.title}</div>
                        <div className="item-meta">
                          <span className="item-target">{log.meta}</span>
                          <span className="item-time">{log.time}</span>
                        </div>
                      </div>
                      <Activity className="item-icon" size={16} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">暂无数据</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 操作趋势 */}
      <Card className="trend-card">
        <CardHeader>
          <h3>本周操作趋势</h3>
        </CardHeader>
        <CardContent>
          <div className="trend-chart">
            <div className="trend-bars">
              {[
                { day: "周一", operations: 65 },
                { day: "周二", operations: 89 },
                { day: "周三", operations: 72 },
                { day: "周四", operations: 95 },
                { day: "周五", operations: 108 },
                { day: "周六", operations: 45 },
                { day: "周日", operations: 58 },
              ].map((item) => (
                <div key={item.day} className="trend-bar">
                  <div className="bar-wrapper">
                    <div
                      className="bar"
                      style={{ height: `${(item.operations / 150) * 100}%` }}
                    ></div>
                  </div>
                  <span className="bar-label">{item.day}</span>
                  <span className="bar-value">{item.operations}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <style>{`
        .dashboard {
          padding: 0;
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          min-height: 100%;
        }

        .welcome-section {
          margin-bottom: 24px;
        }

        .welcome-card {
          border-radius: 16px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border: none;
        }

        .welcome-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 32px;
        }

        .welcome-info {
          flex: 1;
        }

        .welcome-title {
          font-size: 30px;
          font-weight: 700;
          margin: 0 0 8px 0;
          color: white;
        }

        .welcome-subtitle {
          font-size: 16px;
          margin: 0;
          opacity: 0.9;
          color: white;
        }

        .welcome-actions {
          display: flex;
          gap: 12px;
          flex-shrink: 0;
        }

        .welcome-button-success {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
        }

        .welcome-button-success:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .stats-section {
          margin-bottom: 24px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
        }

        .main-content {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .card-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1a202c;
        }

        .quick-actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .quick-action-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: white;
          font-weight: 500;
        }

        .quick-action-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .quick-action-primary {
          background: linear-gradient(135deg, #667eea, #764ba2);
        }

        .quick-action-success {
          background: linear-gradient(135deg, #48bb78, #34d399);
        }

        .quick-action-warning {
          background: linear-gradient(135deg, #ecc94b, #d69e2e);
        }

        .quick-action-info {
          background: linear-gradient(135deg, #4fd1c5, #38b2ac);
        }

        .recent-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .recent-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          background: #f7fafc;
          border-radius: 8px;
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .recent-item:hover {
          background: #edf2f7;
        }

        .item-info {
          flex: 1;
          min-width: 0;
        }

        .item-title {
          font-size: 14px;
          font-weight: 500;
          color: #1a202c;
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #718096;
        }

        .item-id {
          background: #e2e8f0;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
        }

        .item-target {
          color: #4a5568;
          max-width: 150px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .item-icon {
          color: #a0aec0;
        }

        .chart-container {
          padding: 16px 0;
        }

        .type-distribution {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .type-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .type-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          flex-shrink: 0;
        }

        .type-name {
          flex: 1;
          font-size: 14px;
          color: #1a202c;
        }

        .type-value {
          font-size: 14px;
          font-weight: 600;
          color: #1a202c;
        }

        .trend-card {
          margin-top: 24px;
        }

        .trend-chart {
          padding: 16px 0;
        }

        .trend-bars {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 16px;
          height: 200px;
        }

        .trend-bar {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
        }

        .bar-wrapper {
          flex: 1;
          width: 100%;
          display: flex;
          align-items: end;
          justify-content: center;
          margin-bottom: 8px;
        }

        .bar {
          width: 32px;
          background: linear-gradient(135deg, #667eea, #764ba2);
          border-radius: 4px 4px 0 0;
          min-height: 8px;
          transition: all 0.2s ease;
        }

        .trend-bar:hover .bar {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(102, 126, 234, 0.3);
        }

        .bar-label {
          font-size: 12px;
          color: #718096;
          margin-bottom: 4px;
        }

        .bar-value {
          font-size: 12px;
          font-weight: 500;
          color: #1a202c;
        }

        /* 响应式适配 */
        @media (max-width: 1200px) {
          .main-content {
            grid-template-columns: 1fr;
            gap: 20px;
          }
        }

        @media (max-width: 768px) {
          .welcome-content {
            flex-direction: column;
            text-align: center;
          }

          .welcome-actions {
            width: 100%;
            justify-content: center;
          }

          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }

          .quick-actions-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }

          .trend-bars {
            gap: 8px;
            height: 150px;
          }

          .bar {
            width: 24px;
          }
        }

        @media (max-width: 480px) {
          .welcome-content {
            padding: 20px;
          }

          .welcome-title {
            font-size: 24px;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }

          .trend-bars {
            height: 120px;
          }

          .bar {
            width: 20px;
          }

          .bar-label,
          .bar-value {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  trend,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: "primary" | "success" | "warning" | "info";
  trend: number;
  loading: boolean;
}) {
  const getColorClasses = (color: string) => {
    const colors = {
      primary: {
        bg: "bg-blue-50",
        text: "text-blue-600",
        trend: "text-blue-600",
      },
      success: {
        bg: "bg-green-50",
        text: "text-green-600",
        trend: "text-green-600",
      },
      warning: {
        bg: "bg-yellow-50",
        text: "text-yellow-600",
        trend: "text-yellow-600",
      },
      info: {
        bg: "bg-cyan-50",
        text: "text-cyan-600",
        trend: "text-cyan-600",
      },
    };
    return colors[color as keyof typeof colors];
  };

  const colorClasses = getColorClasses(color);

  return (
    <Card className="stat-card cursor-pointer hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-lg ${colorClasses.bg}`}>{icon}</div>
          <div className={`text-sm font-medium ${trend >= 0 ? colorClasses.trend : "text-red-600"}`}>
            {trend >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span className="ml-1">{Math.abs(trend)}%</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? "-" : value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
