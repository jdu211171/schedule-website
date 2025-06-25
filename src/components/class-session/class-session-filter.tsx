"use client";

import React, { useState, useEffect } from "react";
import { X, Filter, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
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
import type {
  Teacher,
  Student,
  Subject,
  ClassType,
  Booth,
} from "@prisma/client";

interface ClassSessionFilterProps {
  teachers: Teacher[];
  students: Student[];
  subjects: Subject[];
  classTypes: ClassType[];
  booths: Booth[];
  filters: {
    teacherId?: string;
    studentId?: string;
    subjectId?: string;
    classTypeId?: string;
    boothId?: string;
    startDate?: string;
    endDate?: string;
  };
  onFilterChange: (field: "teacherId" | "studentId" | "subjectId" | "classTypeId" | "boothId" | "startDate" | "endDate", value: string | undefined) => void;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onResetFilters: () => void;
}

export function ClassSessionFilter({
  teachers = [],
  students = [],
  subjects = [],
  classTypes = [],
  booths = [],
  filters,
  onFilterChange,
  onDateRangeChange,
  onResetFilters,
}: ClassSessionFilterProps) {
  // Storage key for filter open/closed persistence
  const FILTER_OPEN_KEY = "classsessionfilter_open";

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
    return undefined;
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
      setDateRange(undefined);
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
          {/* Date range filter - using SimpleDateRangePicker */}
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

          {/* Teacher filter */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">講師</label>
            <Select
              value={filters.teacherId || "all"}
              onValueChange={(value) =>
                onFilterChange("teacherId", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="全ての講師" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての講師</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.teacherId} value={teacher.teacherId}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Student filter */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">生徒</label>
            <Select
              value={filters.studentId || "all"}
              onValueChange={(value) =>
                onFilterChange("studentId", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="全ての生徒" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての生徒</SelectItem>
                {students.map((student) => (
                  <SelectItem key={student.studentId} value={student.studentId}>
                    {student.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject filter */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">科目</label>
            <Select
              value={filters.subjectId || "all"}
              onValueChange={(value) =>
                onFilterChange("subjectId", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="全ての科目" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての科目</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.subjectId} value={subject.subjectId}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Class Type filter */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">授業タイプ</label>
            <Select
              value={filters.classTypeId || "all"}
              onValueChange={(value) =>
                onFilterChange(
                  "classTypeId",
                  value === "all" ? undefined : value
                )
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="全ての授業タイプ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全ての授業タイプ</SelectItem>
                {classTypes.map((classType) => (
                  <SelectItem
                    key={classType.classTypeId}
                    value={classType.classTypeId}
                  >
                    {classType.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Booth filter */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">ブース</label>
            <Select
              value={filters.boothId || "all"}
              onValueChange={(value) =>
                onFilterChange("boothId", value === "all" ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="全てのブース" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全てのブース</SelectItem>
                {booths.map((booth) => (
                  <SelectItem key={booth.boothId} value={booth.boothId}>
                    {booth.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}