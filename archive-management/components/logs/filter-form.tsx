"use client";

import { useState } from "react";
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

export interface FilterState {
  operation?: string;
  startDate?: string;
  endDate?: string;
  operator?: string;
}

interface FilterFormProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
}

export function FilterForm({ filters, onFilterChange, onReset }: FilterFormProps) {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = {
      ...localFilters,
      [key]: value || undefined,
    };
    setLocalFilters(newFilters);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange(localFilters);
  };

  const handleQuickFilter = (days: number) => {
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const newFilters = {
      ...localFilters,
      startDate: startDate.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0],
    };

    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterState = {};
    setLocalFilters(resetFilters);
    onReset();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Operation Type */}
        <div className="space-y-2">
          <Label htmlFor="operation">操作类型</Label>
          <Select
            value={localFilters.operation || "all"}
            onValueChange={(value) =>
              handleFilterChange("operation", value === "all" ? "" : value)
            }
          >
            <SelectTrigger id="operation">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="delete">删除</SelectItem>
              <SelectItem value="modify">修改</SelectItem>
              <SelectItem value="download">下载</SelectItem>
              <SelectItem value="import">入库</SelectItem>
              <SelectItem value="create">创建</SelectItem>
              <SelectItem value="view">查看</SelectItem>
              <SelectItem value="login">登录</SelectItem>
              <SelectItem value="logout">登出</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startDate">开始日期</Label>
          <Input
            id="startDate"
            type="date"
            value={localFilters.startDate || ""}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
          />
        </div>

        {/* End Date */}
        <div className="space-y-2">
          <Label htmlFor="endDate">结束日期</Label>
          <Input
            id="endDate"
            type="date"
            value={localFilters.endDate || ""}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
          />
        </div>

        {/* Operator */}
        <div className="space-y-2">
          <Label htmlFor="operator">操作人</Label>
          <Input
            id="operator"
            type="text"
            placeholder="输入操作人用户名"
            value={localFilters.operator || ""}
            onChange={(e) => handleFilterChange("operator", e.target.value)}
          />
        </div>
      </div>

      {/* Quick Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter(1)}
          >
            今日
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter(7)}
          >
            本周
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickFilter(30)}
          >
            本月
          </Button>
        </div>

        <div className="flex gap-2">
          <Button type="submit" size="sm">
            查询
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleReset}>
            重置
          </Button>
        </div>
      </div>
    </form>
  );
}
