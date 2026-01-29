"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  FolderOpen,
  Upload,
  FileText,
  Users,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLoading } from "@/lib/loading-context";

interface SidebarProps {
  username: string;
  role: string;
  userId: string;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  admin?: boolean;
}

const menuItems: MenuItem[] = [
  { title: "数据看板", href: "/dashboard", icon: <LayoutDashboard size={20} /> },
  { title: "搜索", href: "/search", icon: <Search size={20} /> },
  { title: "档案管理", href: "/archives", icon: <FolderOpen size={20} /> },
  { title: "批量入库", href: "/import", icon: <Upload size={20} /> },
  { title: "操作日志", href: "/logs", icon: <FileText size={20} /> },
  { title: "用户管理", href: "/users", icon: <Users size={20} />, admin: true },
  { title: "许可证管理", href: "/licenses", icon: <CreditCard size={20} />, admin: true },
];

export function Sidebar({ username, role, userId }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<{ top: number; left: number } | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [userMenuPosition, setUserMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const userAvatarRef = useRef<HTMLDivElement>(null);
  const userMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setLoading } = useLoading();

  const isAdmin = role === "admin" || role === "管理员";

  // 清除定时器
  const clearUserMenuTimeout = () => {
    if (userMenuTimeoutRef.current) {
      clearTimeout(userMenuTimeoutRef.current);
      userMenuTimeoutRef.current = null;
    }
  };

  // 延迟关闭用户菜单
  const scheduleUserMenuClose = () => {
    clearUserMenuTimeout();
    userMenuTimeoutRef.current = setTimeout(() => {
      setUserMenuOpen(false);
    }, 150); // 150ms 延迟
  };

  // 立即打开用户菜单
  const openUserMenu = () => {
    clearUserMenuTimeout();
    setUserMenuOpen(true);
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      clearUserMenuTimeout();
    };
  }, []);

  const handleMouseEnter = (href: string, event: React.MouseEvent) => {
    if (collapsed) {
      const rect = event.currentTarget.getBoundingClientRect();
      const menuWidth = 200; // 增加估算宽度，包含图标和文字
      const menuHeight = 44; // 估算高度

      let left = rect.right + 8;
      let top = rect.top;

      // 检测是否超出右边缘
      if (left + menuWidth > window.innerWidth - 16) {
        // 改为从左侧弹出
        left = rect.left - menuWidth - 8;
      }

      // 确保不超出左边缘
      if (left < 8) {
        left = 8;
      }

      // 检测是否超出下边缘
      if (top + menuHeight > window.innerHeight - 16) {
        top = window.innerHeight - menuHeight - 16;
      }

      // 确保不超出上边缘
      if (top < 8) {
        top = 8;
      }

      console.log('Menu item position:', { left, top, rect, windowWidth: window.innerWidth });
      setHoveredPosition({ top, left });
      setHoveredItem(href);
    }
  };

  const handleMouseLeave = () => {
    setHoveredItem(null);
    setHoveredPosition(null);
  };

  const handleUserAvatarMouseEnter = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 180; // 稍微增加宽度估算
    const menuHeight = 120; // 增加高度估算

    let left = 0;
    let top = 0;

    if (collapsed) {
      // 收缩状态：从右侧弹出
      left = rect.right + 8;
      top = rect.top;

      // 检测是否超出右边缘
      if (left + menuWidth > window.innerWidth - 16) {
        // 改为从左侧弹出
        left = rect.left - menuWidth - 8;
      }

      // 检测是否超出下边缘
      if (top + menuHeight > window.innerHeight - 16) {
        top = window.innerHeight - menuHeight - 16;
      }
    } else {
      // 展开状态：从下方弹出
      left = rect.left;
      top = rect.bottom + 8;

      // 检测是否超出右边缘
      if (left + menuWidth > window.innerWidth - 16) {
        left = window.innerWidth - menuWidth - 16;
      }

      // 检测是否超出下边缘
      if (top + menuHeight > window.innerHeight - 16) {
        // 改为从上方弹出
        top = rect.top - menuHeight - 8;
      }
    }

    // 确保不超出左边缘
    if (left < 8) {
      left = 8;
    }

    // 确保不超出上边缘
    if (top < 8) {
      top = 8;
    }

    console.log('User menu position:', { collapsed, left, top, rect, windowWidth: window.innerWidth });
    setUserMenuPosition({ top, left });
    openUserMenu();
  };

  const handleLogout = async () => {
    setLoading(true, "正在退出...");
    try {
      const response = await fetch("/api/auth/signout", { method: "POST" });
      if (response.ok) {
        window.location.href = "/login";
      } else {
        throw new Error("Signout failed");
      }
    } catch (error) {
      console.error("Logout failed:", error);
      // 即使失败也跳转到登录页
      window.location.href = "/login";
    }
  };

  return (
    <>
      <aside
        ref={sidebarRef}
        className={cn(
          "bg-gray-900 text-white transition-all duration-300 flex flex-col h-screen",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-gray-800">
          {!collapsed && (
            <h1 className="text-xl font-bold truncate">档案管理系统</h1>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-gray-800 transition-colors flex-shrink-0"
            aria-label={collapsed ? "展开菜单" : "收缩菜单"}
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {menuItems.map((item) => {
              if (item.admin && !isAdmin) return null;

              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center px-3 py-2 rounded-md transition-colors",
                      isActive
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-800 text-gray-300",
                      collapsed && "justify-center"
                    )}
                    onMouseEnter={(e) => handleMouseEnter(item.href, e)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <span className="ml-3 truncate">{item.title}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-gray-800">
          {!collapsed ? (
            <div
              ref={userAvatarRef}
              className="flex items-center justify-between cursor-pointer hover:bg-gray-800 -mx-4 px-4 py-2 transition-colors rounded-md"
              onMouseEnter={handleUserAvatarMouseEnter}
              onMouseLeave={scheduleUserMenuClose}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{username}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {role === "admin" ? "管理员" : "用户"}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={userAvatarRef}
              className="flex justify-center cursor-pointer hover:bg-gray-800 -mx-4 px-4 py-2 transition-colors rounded-md"
              onMouseEnter={handleUserAvatarMouseEnter}
              onMouseLeave={scheduleUserMenuClose}
            >
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-sm font-medium">
                  {username.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Floating expanded menu - rendered outside sidebar */}
      {collapsed && hoveredItem && hoveredPosition && (
        <div
          className="fixed px-4 py-2 bg-gray-800 text-white rounded-md shadow-lg z-50 flex items-center gap-3 whitespace-nowrap pointer-events-none"
          style={{
            top: `${hoveredPosition.top}px`,
            left: `${hoveredPosition.left + 8}px`,
          }}
        >
          {menuItems.find((item) => item.href === hoveredItem)?.icon}
          <span>{menuItems.find((item) => item.href === hoveredItem)?.title}</span>
        </div>
      )}

      {/* User dropdown menu */}
      {userMenuOpen && userMenuPosition && (
        <div
          className="fixed bg-white rounded-lg shadow-lg py-2 z-50 min-w-[160px]"
          style={{
            top: `${userMenuPosition.top}px`,
            left: collapsed ? `${userMenuPosition.left}px` : `${userMenuPosition.left}px`,
          }}
          onMouseEnter={openUserMenu}
          onMouseLeave={scheduleUserMenuClose}
        >
          {/* User info header */}
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">{username}</p>
            <p className="text-xs text-gray-500">
              {role === "admin" ? "管理员" : "用户"}
            </p>
          </div>

          {/* Menu items */}
          <button
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 transition-colors"
            onClick={handleLogout}
          >
            <LogOut size={16} />
            <span>退出登录</span>
          </button>
        </div>
      )}
    </>
  );
}
