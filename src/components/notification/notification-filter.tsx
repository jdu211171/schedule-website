"use client";

import React, { useState, useEffect } from "react";
import { X, Filter, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, subDays } from "date-fns";
import { NotificationStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SimpleDateRangePicker } from "../fix-date-range-picker/simple-date-range-picker";

interface NotificationFilterProps {
  filters: {
    status?: NotificationStatus;
    recipientType?: string;
    notificationType?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  };
  onFilterChange: (
    field:
      | "status"
      | "recipientType"
      | "notificationType"
      | "startDate"
      | "endDate"
      | "search",
    value: string | undefined
  ) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onResetFilters: () => void;
}

export function NotificationFilter({
  filters,
  onFilterChange,
  onDateRangeChange,
  onResetFilters,
}: NotificationFilterProps) {
  // Storage key for filter open/closed persistence
  const FILTER_OPEN_KEY = "notificationfilter_open";

  // Initialize with a default value, will be updated after mount
  const [isOpen, setIsOpen] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (filters.startDate && filters.endDate) {
      return {
        from: new Date(filters.startDate),
        to: new Date(filters.endDate),
      };
    } else if (filters.startDate) {
      return {
        from: new Date(filters.startDate),
        to: undefined,
      };
    }
    // Default to yesterday
    return {
      from: subDays(new Date(), 1),
      to: new Date(),
    };
  });

  // On component mount, load the saved open/closed state from localStorage
  useEffect(() => {
    const savedOpen = localStorage.getItem(FILTER_OPEN_KEY);
    if (savedOpen !== null) {
      setIsOpen(savedOpen === "true");
    }
    setIsInitialized(true);
  }, []);

  // Sync dateRange state when filters prop changes (e.g., when reset)
  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      setDateRange({
        from: new Date(filters.startDate),
        to: new Date(filters.endDate),
      });
    } else if (filters.startDate) {
      setDateRange({
        from: new Date(filters.startDate),
        to: undefined,
      });
    } else {
      // Default to yesterday when no filters
      setDateRange({
        from: subDays(new Date(), 1),
        to: new Date(),
      });
    }
  }, [filters.startDate, filters.endDate]);

  // Handle open/close change and save to localStorage
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    localStorage.setItem(FILTER_OPEN_KEY, String(open));
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    onDateRangeChange(range);
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  if (!isInitialized) {
    return null; // Show nothing during initial render to prevent flicker
  }

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className="w-full space-y-2"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4" />
          <h4 className="text-sm font-semibold">フィルター</h4>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
              {activeFilterCount}
            </Badge>
          )}
        </div>
        <div className="flex space-x-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetFilters}
              className="h-8 px-2 lg:px-3"
            >
              リセット
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 lg:h-9 lg:w-9"
            >
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", {
                  "rotate-180": isOpen,
                })}
              />
              <span className="sr-only">
                {isOpen ? "フィルターを閉じる" : "フィルターを開く"}
              </span>
            </Button>
          </CollapsibleTrigger>
        </div>
      </div>
      <CollapsibleContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          {/* Search filter */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">メッセージ検索</label>
            <Input
              placeholder="メッセージを検索..."
              value={filters.search || ""}
              onChange={(e) =>
                onFilterChange("search", e.target.value || undefined)
              }
              className="w-full"
            />
          </div>

          {/* Date range filter */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">日付範囲</label>
            <SimpleDateRangePicker
              value={dateRange}
              onValueChange={handleDateRangeSelect}
              placeholder="期間を選択"
              className="w-full"
              showPresets={true}
              disablePastDates={false}
            />
          </div>

          {/* Status filter */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">ステータス</label>
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                onFilterChange(
                  "status",
                  value === "all" ? undefined : (value as NotificationStatus)
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="全ステータス" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ステータス</SelectItem>
                <SelectItem value={NotificationStatus.FAILED}>失敗</SelectItem>
                <SelectItem value={NotificationStatus.PENDING}>
                  待機中
                </SelectItem>
                <SelectItem value={NotificationStatus.PROCESSING}>
                  処理中
                </SelectItem>
                <SelectItem value={NotificationStatus.SENT}>
                  送信済み
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Recipient Type filter */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">宛先タイプ</label>
            <Select
              value={filters.recipientType || "all"}
              onValueChange={(value) =>
                onFilterChange(
                  "recipientType",
                  value === "all" ? undefined : value
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="全タイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全タイプ</SelectItem>
                <SelectItem value="STUDENT">生徒</SelectItem>
                <SelectItem value="TEACHER">講師</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notification Type filter */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">通知タイプ</label>
            <Select
              value={filters.notificationType || "all"}
              onValueChange={(value) =>
                onFilterChange(
                  "notificationType",
                  value === "all" ? undefined : value
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="全通知タイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全通知タイプ</SelectItem>
                <SelectItem value="CLASS_REMINDER">授業リマインダー</SelectItem>
                <SelectItem value="CLASS_CANCELLATION">
                  授業キャンセル
                </SelectItem>
                <SelectItem value="CLASS_CHANGE">授業変更</SelectItem>
                <SelectItem value="GENERAL">一般通知</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
