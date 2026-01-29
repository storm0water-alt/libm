"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createConfigAction, updateConfigAction } from "@/app/(archive)/config/actions";
import { Settings } from "lucide-react";

interface ConfigItem {
  id: string;
  configKey: string;
  configValue: string;
  configType: string;
  description: string | null;
  group: string;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ConfigFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  groups: string[];
  config?: ConfigItem | null;
}

export function ConfigFormDialog({
  open,
  onOpenChange,
  onSuccess,
  groups,
  config,
}: ConfigFormDialogProps) {
  const isEditing = !!config;

  // Form state
  const [configKey, setConfigKey] = useState(config?.configKey || "");
  const [configValue, setConfigValue] = useState(config?.configValue || "");
  const [configType, setConfigType] = useState(config?.configType || "string");
  const [description, setDescription] = useState(config?.description || "");
  const [group, setGroup] = useState(config?.group || "default");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [keyError, setKeyError] = useState("");

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open) {
      if (config) {
        setConfigKey(config.configKey);
        setConfigValue(config.configValue);
        setConfigType(config.configType);
        setDescription(config.description || "");
        setGroup(config.group);
      } else {
        setConfigKey("");
        setConfigValue("");
        setConfigType("string");
        setDescription("");
        setGroup("default");
      }
      setError("");
      setKeyError("");
    }
  }, [open, config]);

  // Validate config key
  const validateConfigKey = (key: string): boolean => {
    if (!key) {
      setKeyError("配置键不能为空");
      return false;
    }

    if (key.length > 100) {
      setKeyError("配置键不能超过100个字符");
      return false;
    }

    const keyRegex = /^[a-zA-Z0-9._-]+$/;
    if (!keyRegex.test(key)) {
      setKeyError("配置键只能包含字母、数字、点、下划线和连字符");
      return false;
    }

    setKeyError("");
    return true;
  };

  // Handle config key change
  const handleConfigKeyChange = (value: string) => {
    setConfigKey(value);
    if (!isEditing) {
      validateConfigKey(value);
    }
  };

  // Validate config value based on type
  const validateConfigValue = (value: string, type: string): boolean => {
    switch (type) {
      case "number":
        const num = Number(value);
        if (isNaN(num)) {
          setError("配置值必须是数字");
          return false;
        }
        break;
      case "boolean":
        if (value !== "true" && value !== "false") {
          setError("配置值必须是 true 或 false");
          return false;
        }
        break;
      case "json":
        try {
          JSON.parse(value);
        } catch {
          setError("配置值必须是有效的 JSON 格式");
          return false;
        }
        break;
    }

    setError("");
    return true;
  };

  // Handle config value change
  const handleConfigValueChange = (value: string) => {
    setConfigValue(value);
    validateConfigValue(value, configType);
  };

  // Handle config type change
  const handleConfigTypeChange = (value: string) => {
    setConfigType(value);

    // Auto-format value when changing type
    if (configValue) {
      switch (value) {
        case "boolean":
          setConfigValue("true");
          break;
        case "number":
          const num = Number(configValue);
          if (!isNaN(num)) {
            setConfigValue(num.toString());
          } else {
            setConfigValue("0");
          }
          break;
        case "json":
          try {
            // Try to parse as JSON, if it's already valid
            JSON.parse(configValue);
          } catch {
            // If not valid JSON, wrap in object
            setConfigValue(JSON.stringify({ value: configValue }));
          }
          break;
        default:
          // string type, keep as is
          break;
      }
    }

    setError("");
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!isEditing && !validateConfigKey(configKey)) {
      return;
    }

    if (!validateConfigValue(configValue, configType)) {
      return;
    }

    if (description && description.length > 500) {
      setError("描述不能超过500个字符");
      return;
    }

    if (group.length > 50) {
      setError("分组名称不能超过50个字符");
      return;
    }

    setLoading(true);
    setError("");

    try {
      let result;

      if (isEditing) {
        // Update existing config
        result = await updateConfigAction({
          configKey: config.configKey,
          configValue,
          configType,
        });
      } else {
        // Create new config
        result = await createConfigAction({
          configKey,
          configValue,
          configType,
          description,
          group,
        });
      }

      if (result.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(result.error || "操作失败");
      }
    } catch (err) {
      console.error("Failed to save config:", err);
      setError("操作失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {isEditing ? "编辑配置" : "新增配置"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "修改配置值和描述信息"
              : "创建新的系统配置项"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Config Key */}
            <div className="grid gap-2">
              <Label htmlFor="configKey">
                配置键 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="configKey"
                value={configKey}
                onChange={(e) => handleConfigKeyChange(e.target.value)}
                placeholder="例如: system.name"
                disabled={isEditing}
                className={keyError ? "border-destructive" : ""}
              />
              {keyError && (
                <p className="text-sm text-destructive">{keyError}</p>
              )}
              {!isEditing && (
                <p className="text-xs text-muted-foreground">
                  配置键创建后不可修改，只能包含字母、数字、点、下划线和连字符
                </p>
              )}
            </div>

            {/* Config Value */}
            <div className="grid gap-2">
              <Label htmlFor="configValue">
                配置值 <span className="text-destructive">*</span>
              </Label>
              {configType === "json" ? (
                <textarea
                  id="configValue"
                  value={configValue}
                  onChange={(e) => handleConfigValueChange(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              ) : (
                <Input
                  id="configValue"
                  value={configValue}
                  onChange={(e) => handleConfigValueChange(e.target.value)}
                  placeholder="输入配置值"
                  type={configType === "number" ? "number" : "text"}
                />
              )}
              {configType === "boolean" && (
                <p className="text-xs text-muted-foreground">
                  请输入 true 或 false
                </p>
              )}
              {configType === "json" && (
                <p className="text-xs text-muted-foreground">
                  请输入有效的 JSON 格式
                </p>
              )}
            </div>

            {/* Config Type */}
            <div className="grid gap-2">
              <Label htmlFor="configType">
                配置类型 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={configType}
                onValueChange={handleConfigTypeChange}
                disabled={isEditing}
              >
                <SelectTrigger id="configType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">字符串</SelectItem>
                  <SelectItem value="number">数字</SelectItem>
                  <SelectItem value="boolean">布尔值</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  配置类型创建后不可修改
                </p>
              )}
            </div>

            {/* Group */}
            <div className="grid gap-2">
              <Label htmlFor="group">分组</Label>
              {isEditing ? (
                <Input
                  id="group"
                  value={group}
                  disabled
                  className="bg-muted"
                />
              ) : (
                <>
                  <Select value={group} onValueChange={setGroup}>
                    <SelectTrigger id="group">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">默认</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">自定义...</SelectItem>
                    </SelectContent>
                  </Select>
                  {group === "__custom__" && (
                    <Input
                      value={group === "__custom__" ? "" : group}
                      onChange={(e) => setGroup(e.target.value)}
                      placeholder="输入分组名称"
                      className="mt-2"
                    />
                  )}
                </>
              )}
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="description">描述</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="配置项说明（可选）"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "保存中..." : isEditing ? "保存" : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
