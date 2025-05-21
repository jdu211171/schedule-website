"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { CalendarIcon, X, Filter, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  onFilterChange: (field: string, value: string | undefined) => void;
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
  onResetFilters,
}: ClassSessionFilterProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    filters.startDate ? new Date(filters.startDate) : undefined
  );

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      onFilterChange("startDate", format(date, "yyyy-MM-dd"));
      onFilterChange("endDate", format(date, "yyyy-MM-dd"));
    } else {
      onFilterChange("startDate", undefined);
      onFilterChange("endDate", undefined);
    }
  };

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {/* Date filter with calendar */}
          <div className="space-y-2">
            <label className="text-xs font-medium">日付</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate
                    ? format(selectedDate, "yyyy年MM月dd日", { locale: ja })
                    : "日付を選択"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  initialFocus
                  locale={ja}
                />
                {selectedDate && (
                  <div className="border-t p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDateSelect(undefined)}
                    >
                      クリア
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {/* Teacher filter */}
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
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
          <div className="space-y-2">
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
