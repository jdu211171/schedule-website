"use client";

import React, { useState, useEffect } from "react";
import { X, Filter, ChevronDown } from "lucide-react";
import { DateRange } from "react-day-picker";
import { format, parseISO } from "date-fns";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
// Note: Select filters for subject/classType/booth removed in favor of compatibility comboboxes
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { SimpleDateRangePicker } from "../fix-date-range-picker/simple-date-range-picker";
import { Combobox } from "@/components/ui/combobox";
import { useSmartSelection, EnhancedTeacher, EnhancedStudent } from "@/hooks/useSmartSelection";
import { useDebounce } from "@/hooks/use-debounce";
import { CompatibilityComboboxItem, getCompatibilityPriority, renderCompatibilityComboboxItem } from "@/components/admin-schedule/compatibility-combobox-utils";
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
    isCancelled?: boolean;
  };
  onFilterChange: (field: "teacherId" | "studentId" | "subjectId" | "classTypeId" | "boothId" | "startDate" | "endDate" | "isCancelled", value: string | boolean | undefined) => void;
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

  // Count active filters (presented in UI)
  const activeFilterCount = [
    filters.teacherId,
    filters.studentId,
    filters.subjectId,
    filters.classTypeId,
    filters.boothId,
    filters.startDate,
    filters.endDate,
    filters.isCancelled ? "1" : "",
  ].filter(Boolean).length;

  // Smart teacher/student selection with search (matching 日次 view behavior)
  const [teacherSearch, setTeacherSearch] = useState<string>("");
  const [studentSearch, setStudentSearch] = useState<string>("");
  const debouncedTeacher = useDebounce(teacherSearch, 300);
  const debouncedStudent = useDebounce(studentSearch, 300);

  const {
    enhancedTeachers,
    enhancedStudents,
    isFetchingTeachers,
    isFetchingStudents,
    isLoadingTeachers: isLoadingTeachersSmart,
    isLoadingStudents: isLoadingStudentsSmart,
  } = useSmartSelection({
    selectedTeacherId: filters.teacherId,
    selectedStudentId: filters.studentId,
    activeOnly: true,
    teacherSearchTerm: debouncedTeacher,
    studentSearchTerm: debouncedStudent,
  });

  const teacherComboItems: CompatibilityComboboxItem[] = enhancedTeachers
    .map((teacher: EnhancedTeacher) => {
      let description = "";
      let matchingSubjectsCount = 0;
      let partialMatchingSubjectsCount = 0;

      if (teacher.compatibilityType === "perfect") {
        description = `${teacher.matchingSubjectsCount}件の完全一致`;
        matchingSubjectsCount = teacher.matchingSubjectsCount;
        if (teacher.partialMatchingSubjectsCount > 0) {
          description += `, ${teacher.partialMatchingSubjectsCount}件の部分一致`;
          partialMatchingSubjectsCount = teacher.partialMatchingSubjectsCount;
        }
      } else if (teacher.compatibilityType === "subject-only") {
        description = `${teacher.partialMatchingSubjectsCount}件の部分一致`;
        partialMatchingSubjectsCount = teacher.partialMatchingSubjectsCount;
      } else if (teacher.compatibilityType === "mismatch") {
        description = "共通科目なし";
      } else if (teacher.compatibilityType === "teacher-no-prefs") {
        description = "科目設定なし";
      } else if (teacher.compatibilityType === "student-no-prefs") {
        description = "生徒の設定なし（全対応可）";
      }

      const keywords = [teacher.name, teacher.kanaName, teacher.email, teacher.username]
        .filter((k): k is string => Boolean(k))
        .map((k) => k.toLowerCase());

      return {
        value: teacher.teacherId,
        label: teacher.name,
        description,
        compatibilityType: teacher.compatibilityType,
        matchingSubjectsCount,
        partialMatchingSubjectsCount,
        keywords,
      } as CompatibilityComboboxItem;
    })
    .sort((a, b) => {
      const priorityDiff = getCompatibilityPriority(b.compatibilityType) - getCompatibilityPriority(a.compatibilityType);
      if (priorityDiff !== 0) return priorityDiff;
      const labelA = typeof a.label === "string" ? a.label : String(a.label ?? "");
      const labelB = typeof b.label === "string" ? b.label : String(b.label ?? "");
      return labelA.localeCompare(labelB, "ja");
    });

  const studentComboItems: CompatibilityComboboxItem[] = enhancedStudents
    .map((student: EnhancedStudent) => {
      let description = "";
      let matchingSubjectsCount = 0;
      let partialMatchingSubjectsCount = 0;

      if (student.compatibilityType === "perfect") {
        description = `${student.matchingSubjectsCount}件の完全一致`;
        matchingSubjectsCount = student.matchingSubjectsCount;
        if (student.partialMatchingSubjectsCount > 0) {
          description += `, ${student.partialMatchingSubjectsCount}件の部分一致`;
          partialMatchingSubjectsCount = student.partialMatchingSubjectsCount;
        }
      } else if (student.compatibilityType === "subject-only") {
        description = `${student.partialMatchingSubjectsCount}件の部分一致`;
        partialMatchingSubjectsCount = student.partialMatchingSubjectsCount;
      } else if (student.compatibilityType === "mismatch") {
        description = "共通科目なし";
      } else if (student.compatibilityType === "student-no-prefs") {
        description = "科目設定なし";
      } else if (student.compatibilityType === "teacher-no-prefs") {
        description = "講師の設定なし（全対応可）";
      }

      const keywords = [student.name, student.kanaName, student.email, student.username]
        .filter((k): k is string => Boolean(k))
        .map((k) => k.toLowerCase());

      return {
        value: student.studentId,
        label: student.name,
        description,
        compatibilityType: student.compatibilityType,
        matchingSubjectsCount,
        partialMatchingSubjectsCount,
        keywords,
      } as CompatibilityComboboxItem;
    })
    .sort((a, b) => {
      const priorityDiff = getCompatibilityPriority(b.compatibilityType) - getCompatibilityPriority(a.compatibilityType);
      if (priorityDiff !== 0) return priorityDiff;
      const labelA = typeof a.label === "string" ? a.label : String(a.label ?? "");
      const labelB = typeof b.label === "string" ? b.label : String(b.label ?? "");
      return labelA.localeCompare(labelB, "ja");
    });

  // Simple searchable combobox items for Subject / ClassType / Booth
  const subjectComboItems: CompatibilityComboboxItem[] = (subjects || []).map((subject) => ({
    value: (subject as any).subjectId,
    label: (subject as any).name,
    keywords: [String((subject as any).name || '').toLowerCase()],
  }));

  const classTypeComboItems: CompatibilityComboboxItem[] = [
    { value: "__CANCELLED__", label: "キャンセル", keywords: ["キャンセル", "cancelled", "canceled"] },
    ...((classTypes || []).map((ct) => ({
      value: (ct as any).classTypeId,
      label: (ct as any).name,
      keywords: [String((ct as any).name || '').toLowerCase()],
    })))
  ];

  const boothComboItems: CompatibilityComboboxItem[] = (booths || []).map((b) => ({
    value: (b as any).boothId,
    label: (b as any).name,
    keywords: [String((b as any).name || '').toLowerCase()],
  }));

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

          {/* Teacher filter (compatibility combobox) */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">講師</label>
            <Combobox<CompatibilityComboboxItem>
              items={teacherComboItems}
              value={filters.teacherId || ""}
              onValueChange={(val) => onFilterChange("teacherId", val || undefined)}
              placeholder="講師を選択"
              searchPlaceholder="講師を検索..."
              emptyMessage="講師が見つかりません"
              disabled={false}
              clearable
              searchValue={teacherSearch}
              onSearchChange={setTeacherSearch}
              loading={isLoadingTeachersSmart || isFetchingTeachers}
              triggerClassName="h-9"
              onOpenChange={(open) => { if (!open) setTeacherSearch("") }}
              renderItem={renderCompatibilityComboboxItem}
            />
          </div>

          {/* Student filter (compatibility combobox) */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">生徒</label>
            <Combobox<CompatibilityComboboxItem>
              items={studentComboItems}
              value={filters.studentId || ""}
              onValueChange={(val) => onFilterChange("studentId", val || undefined)}
              placeholder="生徒を選択"
              searchPlaceholder="生徒を検索..."
              emptyMessage="生徒が見つかりません"
              disabled={false}
              clearable
              searchValue={studentSearch}
              onSearchChange={setStudentSearch}
              loading={isLoadingStudentsSmart || isFetchingStudents}
              triggerClassName="h-9"
              onOpenChange={(open) => { if (!open) setStudentSearch("") }}
              renderItem={renderCompatibilityComboboxItem}
            />
          </div>

          {/* Subject filter (simple searchable combobox) */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">科目</label>
            <Combobox<CompatibilityComboboxItem>
              items={subjectComboItems}
              value={filters.subjectId || ""}
              onValueChange={(val) => onFilterChange("subjectId", val || undefined)}
              placeholder="科目を選択"
              searchPlaceholder="科目を検索..."
              emptyMessage="科目が見つかりません"
              disabled={false}
              clearable
              triggerClassName="h-9"
            />
          </div>

          {/* Class Type filter (simple searchable combobox) */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">授業タイプ</label>
            <Combobox<CompatibilityComboboxItem>
              items={classTypeComboItems}
              value={filters.isCancelled ? "__CANCELLED__" : (filters.classTypeId || "")}
              onValueChange={(val) => {
                if (val === "__CANCELLED__") {
                  onFilterChange("isCancelled", true);
                  onFilterChange("classTypeId", undefined);
                } else {
                  onFilterChange("isCancelled", undefined);
                  onFilterChange("classTypeId", val || undefined);
                }
              }}
              placeholder="授業タイプを選択"
              searchPlaceholder="授業タイプを検索..."
              emptyMessage="授業タイプが見つかりません"
              disabled={false}
              clearable
              triggerClassName="h-9"
            />
          </div>

          {/* Booth filter (simple searchable combobox) */}
          <div className="space-y-2 min-w-0">
            <label className="text-xs font-medium">ブース</label>
            <Combobox<CompatibilityComboboxItem>
              items={boothComboItems}
              value={filters.boothId || ""}
              onValueChange={(val) => onFilterChange("boothId", val || undefined)}
              placeholder="ブースを選択"
              searchPlaceholder="ブースを検索..."
              emptyMessage="ブースが見つかりません"
              disabled={false}
              clearable
              triggerClassName="h-9"
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
