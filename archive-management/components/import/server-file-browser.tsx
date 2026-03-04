"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FolderOpen,
  File,
  HardDrive,
  ChevronRight,
  Home,
} from "lucide-react";
import { toast } from "sonner";

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: Date;
}

interface BrowseResponse {
  currentPath: string;
  parentPath: string | null;
  items: FileItem[];
}

interface PlatformInfo {
  platform: string;
  quickNavPaths: Array<{ path: string; label: string }>;
  defaultPath: string;
}

interface ScanFilter {
  minSize?: number;
  maxSize?: number;
  namePattern?: string;
}

interface ServerFileBrowserProps {
  onPathSelected: (path: string) => void;
  disabled?: boolean;
  filter?: ScanFilter;
}

export function ServerFileBrowser({ onPathSelected, disabled = false, filter }: ServerFileBrowserProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pathInput, setPathInput] = useState("");
  const [platformInfo, setPlatformInfo] = useState<PlatformInfo | null>(null);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    try {
      // Build query params with filter
      const params = new URLSearchParams({ path: path });
      if (filter?.minSize) params.append('minSize', filter.minSize.toString());
      if (filter?.maxSize) params.append('maxSize', filter.maxSize.toString());
      if (filter?.namePattern) params.append('namePattern', filter.namePattern);

      const response = await fetch(`/api/browse?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to browse: ${response.status}`);
      }

      const result: { success: boolean; data?: BrowseResponse; error?: string } = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to browse directory");
      }

      setCurrentPath(result.data.currentPath);
      setItems(result.data.items);
      setPathInput(result.data.currentPath);
    } catch (error) {
      console.error("Browse error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to browse directory");
    } finally {
      setLoading(false);
    }
  };

  const fetchPlatformInfo = async () => {
    try {
      const response = await fetch("/api/browse/platform");
      if (!response.ok) {
        throw new Error("Failed to fetch platform info");
      }

      const result: { success: boolean; data?: PlatformInfo; error?: string } = await response.json();
      
      if (result.success && result.data) {
        setPlatformInfo(result.data);
        return result.data;
      }
      return null;
    } catch (error) {
      console.error("Platform detection error:", error);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      const info = await fetchPlatformInfo();
      if (info) {
        loadDirectory(info.defaultPath);
      } else {
        loadDirectory("/");
      }
    };
    init();
  }, []);

  // Reload when filter changes
  useEffect(() => {
    if (currentPath) {
      loadDirectory(currentPath);
    }
  }, [filter?.minSize, filter?.maxSize, filter?.namePattern]);

  const handleItemClick = (item: FileItem) => {
    if (!item.isDirectory) return;
    loadDirectory(item.path);
  };

  const handleParentClick = () => {
    const separator = platformInfo?.platform === "win32" ? "\\" : "/";
    const lastSepIndex = currentPath.lastIndexOf(separator);
    const parentPath = lastSepIndex > 0 
      ? currentPath.substring(0, lastSepIndex) 
      : (platformInfo?.platform === "win32" ? currentPath.substring(0, 3) : "/");
    loadDirectory(parentPath);
  };

  const handleQuickNav = (path: string) => {
    loadDirectory(path);
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathInput.trim()) {
      loadDirectory(pathInput.trim());
    }
  };

  const handleSelectDirectory = () => {
    onPathSelected(currentPath);
  };

  return (
    <div className="space-y-4">
      {platformInfo && platformInfo.quickNavPaths.length > 0 && (
        <div className="space-y-2">
          <Label>快速导航</Label>
          <div className="flex flex-wrap gap-2">
            {platformInfo.quickNavPaths.map((p) => (
              <Button
                key={p.path}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickNav(p.path)}
                disabled={disabled || loading}
              >
                <HardDrive className="h-3 w-3 mr-1" />
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="path-input">当前路径</Label>
        <form onSubmit={handlePathSubmit} className="flex gap-2">
          <Input
            id="path-input"
            type="text"
            value={pathInput}
            onChange={(e) => setPathInput(e.target.value)}
            disabled={disabled || loading}
            className="font-mono text-sm"
          />
          <Button type="submit" disabled={disabled || loading} variant="outline">
            转到
          </Button>
        </form>
      </div>

      {currentPath && (
        <div className="flex items-center gap-1 text-sm overflow-x-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2"
            onClick={() => platformInfo && handleQuickNav(platformInfo.defaultPath)}
            disabled={disabled || loading}
          >
            <Home className="h-3 w-3" />
          </Button>
          {(() => {
            const separator = platformInfo?.platform === "win32" ? "\\" : "/";
            const parts = currentPath.split(separator).filter(Boolean);

            return parts.map((part, index) => {
              let path: string;
              if (platformInfo?.platform === "win32") {
                // Windows: reconstruct path properly
                if (index === 0 && part.endsWith(":")) {
                  // Drive letter - add backslash
                  path = part + "\\";
                } else {
                  path = parts.slice(0, index + 1).join(separator);
                }
              } else {
                // Unix: add leading slash
                path = "/" + parts.slice(0, index + 1).join(separator);
              }

              const isLast = index === parts.length - 1;
              return (
                <div key={path} className="flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  <Button
                    type="button"
                    variant={isLast ? "default" : "ghost"}
                    size="sm"
                    className="h-6 px-2"
                    onClick={() => !isLast && loadDirectory(path)}
                    disabled={disabled || loading}
                  >
                    {part}
                  </Button>
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* File List */}
      <div className="border rounded-md">
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead>名称</TableHead>
                <TableHead className="w-[100px]">类型</TableHead>
                <TableHead className="w-[80px]">大小</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    加载中...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    {filter ? "此目录中没有符合条件的文件/文件夹" : "此目录为空"}
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={item.path}
                    className={`cursor-pointer hover:bg-muted/50 ${
                      !item.isDirectory ? "opacity-50" : ""
                    }`}
                    onClick={() => handleItemClick(item)}
                  >
                    <TableCell className="w-[40px]">
                      {item.isDirectory ? (
                        <FolderOpen className="h-4 w-4 text-blue-500" />
                      ) : (
                        <File className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{item.name}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.isDirectory ? "目录" : "文件"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.isDirectory ? "-" : formatFileSize(item.size)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleSelectDirectory}
          disabled={disabled || loading}
          className="flex-1"
        >
          <FolderOpen className="h-4 w-4 mr-2" />
          选择此目录
        </Button>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
