// src/components/student/student-table.tsx
"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Eye, EyeOff, Trash2, MoreHorizontal, Download, Upload, Bell, BellOff, MessageSquare, RotateCcw } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useStudentExport } from "@/hooks/useStudentExport";

import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DataTableDateFilter } from "@/components/data-table/data-table-date-filter";
import { DataTableYearFilter } from "@/components/data-table/data-table-year-filter";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableSliderFilter } from "@/components/data-table/data-table-slider-filter";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTable } from "@/hooks/use-data-table";
import { SubjectPreferencesCell } from "@/components/ui/subject-preferences-cell";
import { flexRender } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Column, Table } from "@tanstack/react-table";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StudentFormDialog } from "./student-form-dialog";
import { Student, useStudents } from "@/hooks/useStudentQuery";
import { useStudentTypes } from "@/hooks/useStudentTypeQuery";
import { useAllSubjects } from "@/hooks/useSubjectQuery";
import { CSVImportDialog } from "@/components/ui/csv-import-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useAllSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import {
  useStudentDelete,
  getResolvedStudentId,
} from "@/hooks/useStudentMutation";
import { userStatusLabels, schoolTypeLabels, examCategoryLabels, examCategoryTypeLabels } from "@/schemas/student.schema";

// Import types to ensure proper column meta support
import "@/components/data-table/types";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Check, PlusCircle, XCircle, Calendar } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Multi-select filter component for student table
interface StudentTableFilterMultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  title: string;
  options: { value: string; label: string }[];
}

function StudentTableFilterMultiSelect({
  value,
  onValueChange,
  title,
  options,
}: StudentTableFilterMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const selectedValues = new Set(value);

  const handleSelect = (optionValue: string) => {
    const newSelectedValues = new Set(selectedValues);
    if (newSelectedValues.has(optionValue)) {
      newSelectedValues.delete(optionValue);
    } else {
      newSelectedValues.add(optionValue);
    }
    onValueChange(Array.from(newSelectedValues));
  };

  const handleClear = () => {
    onValueChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {title}
          {selectedValues.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal"
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`${title}を検索...`} />
          <CommandList>
            <CommandEmpty>結果がありません。</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selectedValues.has(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <Check className={cn("h-4 w-4")} />
                    </div>
                    <span>{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleClear}
                    className="justify-center text-center"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    クリア
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Date filter component for student table
interface StudentTableDateFilterProps {
  value?: { from?: Date; to?: Date };
  onValueChange: (value?: { from?: Date; to?: Date }) => void;
  title: string;
}

function StudentTableDateFilter({
  value,
  onValueChange,
  title,
}: StudentTableDateFilterProps) {
  // Create a mock column that works with DataTableDateFilter
  const mockColumn = {
    getFilterValue: () => {
      if (!value) return undefined;
      if (value.from && value.to) {
        return [value.from.getTime(), value.to.getTime()];
      } else if (value.from) {
        return [value.from.getTime(), undefined];
      } else if (value.to) {
        return [undefined, value.to.getTime()];
      }
      return undefined;
    },
    setFilterValue: (newValue: any) => {
      if (!newValue) {
        onValueChange(undefined);
      } else if (Array.isArray(newValue)) {
        const [from, to] = newValue;
        onValueChange({
          from: from ? new Date(from) : undefined,
          to: to ? new Date(to) : undefined,
        });
      }
    },
  } as any;

  return (
    <DataTableDateFilter
      column={mockColumn}
      title={title}
      multiple={true}
    />
  );
}

// Year filter component for student table
interface StudentTableYearFilterProps {
  value?: { from?: Date; to?: Date };
  onValueChange: (value?: { from?: Date; to?: Date }) => void;
  title: string;
}

function StudentTableYearFilter({
  value,
  onValueChange,
  title,
}: StudentTableYearFilterProps) {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"single" | "range" | "from" | "before">("single");
  const [year, setYear] = React.useState<string>("");
  const [startYear, setStartYear] = React.useState<string>("");
  const [endYear, setEndYear] = React.useState<string>("");

  // Initialize from value
  React.useEffect(() => {
    if (value?.from && value?.to) {
      const fromYear = value.from.getFullYear();
      const toYear = value.to.getFullYear();
      if (fromYear === toYear) {
        setMode("single");
        setYear(fromYear.toString());
      } else {
        setMode("range");
        setStartYear(fromYear.toString());
        setEndYear(toYear.toString());
      }
    } else if (value?.from) {
      setMode("from");
      setYear(value.from.getFullYear().toString());
    } else if (value?.to) {
      setMode("before");
      setYear(value.to.getFullYear().toString());
    }
  }, [value]);

  const handleApply = () => {
    let newValue: { from?: Date; to?: Date } | undefined;

    switch (mode) {
      case "single":
        if (year) {
          const y = parseInt(year);
          newValue = {
            from: new Date(y, 0, 1),
            to: new Date(y, 11, 31, 23, 59, 59),
          };
        }
        break;
      case "range":
        if (startYear && endYear) {
          newValue = {
            from: new Date(parseInt(startYear), 0, 1),
            to: new Date(parseInt(endYear), 11, 31, 23, 59, 59),
          };
        }
        break;
      case "from":
        if (year) {
          newValue = {
            from: new Date(parseInt(year), 0, 1),
          };
        }
        break;
      case "before":
        if (year) {
          newValue = {
            to: new Date(parseInt(year), 11, 31, 23, 59, 59),
          };
        }
        break;
    }

    onValueChange(newValue);
    setOpen(false);
  };

  const handleClear = () => {
    setYear("");
    setStartYear("");
    setEndYear("");
    onValueChange(undefined);
    setOpen(false);
  };

  const currentYear = new Date().getFullYear();
  const hasValue = !!value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 border-dashed"
        >
          <Calendar className="mr-2 h-4 w-4" />
          {title}
          {hasValue && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal"
              >
                {mode === "single" && year}
                {mode === "range" && `${startYear}-${endYear}`}
                {mode === "from" && `${year}年以降`}
                {mode === "before" && `${year}年以前`}
              </Badge>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4 p-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">フィルターモード</label>
            <Select value={mode} onValueChange={(v: any) => setMode(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">特定の年</SelectItem>
                <SelectItem value="range">年の範囲</SelectItem>
                <SelectItem value="from">指定年以降</SelectItem>
                <SelectItem value="before">指定年以前</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "single" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">年</label>
              <Input
                type="number"
                min="1900"
                max={currentYear}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="例: 2000"
              />
            </div>
          )}

          {mode === "range" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">開始年</label>
                <Input
                  type="number"
                  min="1900"
                  max={currentYear}
                  value={startYear}
                  onChange={(e) => setStartYear(e.target.value)}
                  placeholder="例: 1990"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">終了年</label>
                <Input
                  type="number"
                  min="1900"
                  max={currentYear}
                  value={endYear}
                  onChange={(e) => setEndYear(e.target.value)}
                  placeholder="例: 2000"
                />
              </div>
            </div>
          )}

          {(mode === "from" || mode === "before") && (
            <div className="space-y-2">
              <label className="text-sm font-medium">年</label>
              <Input
                type="number"
                min="1900"
                max={currentYear}
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="例: 2000"
              />
            </div>
          )}

          <Separator />

          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
              disabled={!hasValue}
            >
              <XCircle className="mr-2 h-4 w-4" />
              クリア
            </Button>
            <Button size="sm" onClick={handleApply}>
              適用
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Filter type
interface StudentFilters {
  name: string;
  status: string[];
  studentType: string[];
  gradeYear: string[];
  branch: string[];
  subject: string[];
  lineConnection: string[];
  schoolType: string[];
  examCategory: string[];
  examCategoryType: string[];
  birthDateRange?: { from?: Date; to?: Date };
  examDateRange?: { from?: Date; to?: Date };
  phoneNumber: string;
  email: string;
  schoolName: string;
}

// Custom toolbar component without reset button
interface StudentTableToolbarProps extends React.ComponentProps<"div"> {
  table: Table<Student>;
  filters: StudentFilters;
  setFilters: React.Dispatch<React.SetStateAction<StudentFilters>>;
  studentTypes: any[];
  subjects: any[];
  uniqueBranches: { value: string; label: string }[];
  children?: React.ReactNode;
}

function StudentTableToolbar({
  table,
  filters,
  setFilters,
  studentTypes,
  subjects,
  uniqueBranches,
  children,
  className,
  ...props
}: StudentTableToolbarProps) {
  const hasActiveFilters = React.useMemo(() => {
    return !!(
      filters.name ||
      filters.status.length > 0 ||
      filters.studentType.length > 0 ||
      filters.gradeYear.length > 0 ||
      filters.branch.length > 0 ||
      filters.subject.length > 0 ||
      filters.lineConnection.length > 0 ||
      filters.schoolType.length > 0 ||
      filters.examCategory.length > 0 ||
      filters.examCategoryType.length > 0 ||
      filters.birthDateRange ||
      filters.examDateRange ||
      filters.phoneNumber ||
      filters.email ||
      filters.schoolName
    );
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      name: "",
      status: [],
      studentType: [],
      gradeYear: [],
      branch: [],
      subject: [],
      lineConnection: [],
      schoolType: [],
      examCategory: [],
      examCategoryType: [],
      birthDateRange: undefined,
      examDateRange: undefined,
      phoneNumber: "",
      email: "",
      schoolName: "",
    });
  };

  // Generate grade year options
  const gradeYearOptions = React.useMemo(() => {
    const options = [];
    for (let i = 1; i <= 6; i++) {
      options.push({ value: i.toString(), label: `${i}年生` });
    }
    return options;
  }, []);

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={cn(
        "flex w-full items-start justify-between gap-2 p-1",
        className,
      )}
      {...props}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <Input
          placeholder="名前で検索..."
          value={filters.name}
          onChange={(event) => setFilters(prev => ({ ...prev, name: event.target.value }))}
          className="h-8 w-40 lg:w-56"
        />
        <StudentTableFilterMultiSelect
          value={filters.status}
          onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          title="ステータス"
          options={Object.entries(userStatusLabels).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <StudentTableFilterMultiSelect
          value={filters.studentType}
          onValueChange={(value) => setFilters(prev => ({ ...prev, studentType: value }))}
          title="生徒タイプ"
          options={studentTypes.map((type) => ({
            value: type.name,
            label: type.name,
          }))}
        />
        <StudentTableFilterMultiSelect
          value={filters.gradeYear}
          onValueChange={(value) => setFilters(prev => ({ ...prev, gradeYear: value }))}
          title="学年"
          options={gradeYearOptions}
        />
        <StudentTableYearFilter
          value={filters.birthDateRange}
          onValueChange={(value) => setFilters(prev => ({ ...prev, birthDateRange: value }))}
          title="生年月日"
        />
        <StudentTableDateFilter
          value={filters.examDateRange}
          onValueChange={(value) => setFilters(prev => ({ ...prev, examDateRange: value }))}
          title="受験日"
        />
        <Input
          placeholder="電話番号で検索..."
          value={filters.phoneNumber}
          onChange={(event) => setFilters(prev => ({ ...prev, phoneNumber: event.target.value }))}
          className="h-8 w-40 lg:w-56"
        />
        <Input
          placeholder="メールアドレスで検索..."
          value={filters.email}
          onChange={(event) => setFilters(prev => ({ ...prev, email: event.target.value }))}
          className="h-8 w-40 lg:w-56"
        />
        <Input
          placeholder="学校名で検索..."
          value={filters.schoolName}
          onChange={(event) => setFilters(prev => ({ ...prev, schoolName: event.target.value }))}
          className="h-8 w-40 lg:w-56"
        />
        <StudentTableFilterMultiSelect
          value={filters.branch}
          onValueChange={(value) => setFilters(prev => ({ ...prev, branch: value }))}
          title="校舎"
          options={uniqueBranches}
        />
        <StudentTableFilterMultiSelect
          value={filters.subject}
          onValueChange={(value) => setFilters(prev => ({ ...prev, subject: value }))}
          title="受講科目"
          options={subjects.map((subject) => ({
            value: subject.name,
            label: subject.name,
          }))}
        />
        <StudentTableFilterMultiSelect
          value={filters.lineConnection}
          onValueChange={(value) => setFilters(prev => ({ ...prev, lineConnection: value }))}
          title="メッセージ連携"
          options={[
            { value: "connected_enabled", label: "連携済み (通知有効)" },
            { value: "connected_disabled", label: "連携済み (通知無効)" },
            { value: "not_connected", label: "未連携" }
          ]}
        />
        <StudentTableFilterMultiSelect
          value={filters.schoolType}
          onValueChange={(value) => setFilters(prev => ({ ...prev, schoolType: value }))}
          title="学校区分"
          options={[
            { value: "PUBLIC", label: "公立" },
            { value: "PRIVATE", label: "私立" },
            { value: "NATIONAL", label: "国立" },
            { value: "OTHER", label: "その他" }
          ]}
        />
        <StudentTableFilterMultiSelect
          value={filters.examCategory}
          onValueChange={(value) => setFilters(prev => ({ ...prev, examCategory: value }))}
          title="受験カテゴリー"
          options={[
            { value: "JUNIOR_HIGH", label: "中学受験" },
            { value: "HIGH_SCHOOL", label: "高校受験" },
            { value: "UNIVERSITY", label: "大学受験" },
            { value: "OTHER", label: "その他" }
          ]}
        />
        <StudentTableFilterMultiSelect
          value={filters.examCategoryType}
          onValueChange={(value) => setFilters(prev => ({ ...prev, examCategoryType: value }))}
          title="受験タイプ"
          options={[
            { value: "GENERAL", label: "一般" },
            { value: "RECOMMENDATION", label: "推薦" },
            { value: "AO", label: "AO" },
            { value: "INTERNAL", label: "内部進学" },
            { value: "OTHER", label: "その他" }
          ]}
        />
      </div>
      <div className="flex items-center gap-2">
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={handleResetFilters}
            className="h-8 px-2 lg:px-3"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            リセット
          </Button>
        )}
        {children}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}

export function StudentTable() {
  // Storage keys for persistence
  const FILTERS_STORAGE_KEY = "student_filters";
  const COLUMN_VISIBILITY_STORAGE_KEY = "student_column_visibility";

  // Initialize filters with localStorage values or defaults
  const [filters, setFilters] = React.useState<StudentFilters>(() => {
    if (typeof window !== 'undefined') {
      const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (savedFilters) {
        try {
          const parsed = JSON.parse(savedFilters);
          // Ensure all properties have default values
          return {
            name: parsed.name || "",
            status: parsed.status || [],
            studentType: parsed.studentType || [],
            gradeYear: parsed.gradeYear || [],
            branch: parsed.branch || [],
            subject: parsed.subject || [],
            lineConnection: parsed.lineConnection || [],
            schoolType: parsed.schoolType || [],
            examCategory: parsed.examCategory || [],
            examCategoryType: parsed.examCategoryType || [],
            birthDateRange: parsed.birthDateRange ? {
              from: parsed.birthDateRange.from ? new Date(parsed.birthDateRange.from) : undefined,
              to: parsed.birthDateRange.to ? new Date(parsed.birthDateRange.to) : undefined
            } : undefined,
            examDateRange: parsed.examDateRange ? {
              from: parsed.examDateRange.from ? new Date(parsed.examDateRange.from) : undefined,
              to: parsed.examDateRange.to ? new Date(parsed.examDateRange.to) : undefined
            } : undefined,
            phoneNumber: parsed.phoneNumber || "",
            email: parsed.email || "",
            schoolName: parsed.schoolName || "",
          };
        } catch (error) {
          console.error('Error parsing saved filters:', error);
        }
      }
    }
    return {
      name: "",
      status: [] as string[],
      studentType: [] as string[],
      gradeYear: [] as string[],
      branch: [] as string[],
      subject: [] as string[],
      lineConnection: [] as string[],
      schoolType: [] as string[],
      examCategory: [] as string[],
      examCategoryType: [] as string[],
      birthDateRange: undefined,
      examDateRange: undefined,
      phoneNumber: "",
      email: "",
      schoolName: "",
    };
  });

  // Load saved column visibility from localStorage
  const getSavedColumnVisibility = () => {
    if (typeof window !== 'undefined') {
      const savedVisibility = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
      if (savedVisibility) {
        try {
          return JSON.parse(savedVisibility);
        } catch (error) {
          console.error('Error parsing saved column visibility:', error);
        }
      }
    }
    return {};
  };

  // Save filters to localStorage whenever they change
  React.useEffect(() => {
    console.log("[StudentTable] Filters changed:", filters);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    }
  }, [filters]);

  // Reset to first page when filters change
  React.useEffect(() => {
    console.log("[StudentTable] Resetting page to 1 due to filter change");
    setPage(1);
  }, [filters]);


  const debouncedName = useDebounce(filters.name, 300);
  const debouncedPhoneNumber = useDebounce(filters.phoneNumber, 300);
  const debouncedEmail = useDebounce(filters.email, 300);
  const debouncedSchoolName = useDebounce(filters.schoolName, 300);
  const [page, setPage] = React.useState(1);
  const [studentToEdit, setStudentToEdit] = React.useState<Student | null>(
    null
  );
  const [studentToDelete, setStudentToDelete] = React.useState<Student | null>(
    null
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [passwordVisibility, setPasswordVisibility] = React.useState<
    Record<string, boolean>
  >({});
  const queryClient = useQueryClient();
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);

  const pageSize = 10;

  // Load data
  const { data: studentTypesResponse } = useStudentTypes();
  const { data: subjects = [] } = useAllSubjects();
  const { data: subjectTypes = [] } = useAllSubjectTypes();
  const deleteStudentMutation = useStudentDelete();
  const { exportToCSV, isExporting } = useStudentExport();

  // Memoize studentTypes to avoid dependency issues
  const studentTypes = React.useMemo(
    () => studentTypesResponse?.data || [],
    [studentTypesResponse?.data]
  );

  // Parse filter values for API call
  const studentTypeIds = React.useMemo(() => {
    if (filters.studentType.length === 0) return undefined;
    return studentTypes
      .filter((type) => filters.studentType.includes(type.name))
      .map((type) => type.studentTypeId);
  }, [filters.studentType, studentTypes]);

  // Parse branch names back to IDs
  const branchIds = React.useMemo(() => {
    if (filters.branch.length === 0) return undefined;
    // For now, we'll need to fetch branch data separately or pass branch names to API
    // This is a temporary solution until we have a better way to map branch names to IDs
    return filters.branch;
  }, [filters.branch]);

  // Parse subject names to IDs
  const subjectIds = React.useMemo(() => {
    if (filters.subject.length === 0) return undefined;
    return subjects
      .filter((subject) => filters.subject.includes(subject.name))
      .map((subject) => subject.subjectId);
  }, [filters.subject, subjects]);

  // Extract sorting state from URL (will be managed by useDataTable)
  const [sortingState, setSortingState] = React.useState<{ id: string; desc: boolean }[]>([]);

  // Build query parameters for useStudents
  const queryParams = React.useMemo(() => ({
    page,
    limit: pageSize,
    name: debouncedName || undefined,
    studentTypeIds: studentTypeIds,
    gradeYears: filters.gradeYear.map(Number).filter(n => !isNaN(n)),
    statuses: filters.status.length > 0 ? filters.status : undefined,
    branchIds: branchIds,
    subjectIds: subjectIds,
    lineConnection: filters.lineConnection.length > 0 ? filters.lineConnection : undefined,
    schoolTypes: filters.schoolType.length > 0 ? filters.schoolType : undefined,
    examCategories: filters.examCategory.length > 0 ? filters.examCategory : undefined,
    examCategoryTypes: filters.examCategoryType.length > 0 ? filters.examCategoryType : undefined,
    birthDateFrom: filters.birthDateRange?.from,
    birthDateTo: filters.birthDateRange?.to,
    examDateFrom: filters.examDateRange?.from,
    examDateTo: filters.examDateRange?.to,
    phoneNumber: debouncedPhoneNumber || undefined,
    email: debouncedEmail || undefined,
    schoolName: debouncedSchoolName || undefined,
    sortBy: sortingState[0]?.id,
    sortOrder: sortingState[0]?.desc ? "desc" : "asc",
  }), [page, pageSize, debouncedName, studentTypeIds, filters.gradeYear, filters.status, branchIds, subjectIds, filters.lineConnection, filters.schoolType, filters.examCategory, filters.examCategoryType, filters.birthDateRange, filters.examDateRange, debouncedPhoneNumber, debouncedEmail, debouncedSchoolName, sortingState]);

  // Debug logging for query params
  React.useEffect(() => {
    console.log("[StudentTable] Query params being sent to useStudents:", queryParams);
  }, [queryParams]);

  const { data: students, isLoading } = useStudents(queryParams);

  // Extract unique branches from current data
  const uniqueBranches = React.useMemo(() => {
    const branches = new Map<string, string>();
    (students?.data || []).forEach((student) => {
      student.branches?.forEach((branch) => {
        branches.set(branch.branchId, branch.name);
      });
    });
    return Array.from(branches.values()).map((name) => ({
      value: name,
      label: name,
    }));
  }, [students?.data]);

  // No client-side filtering needed - all filtering is done server-side
  const filteredData = students?.data || [];

  const totalCount = students?.pagination.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const columns = React.useMemo<ColumnDef<Student>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        size: 32,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "name",
        accessorKey: "name",
        header: "名前",
        cell: ({ row }) => row.original.name || "-",
      },
      {
        id: "kanaName",
        accessorKey: "kanaName",
        header: "カナ",
        cell: ({ row }) => row.original.kanaName || "-",
      },
      {
        id: "status",
        accessorKey: "status",
        header: "ステータス",
        cell: ({ row }) => {
          const status = row.original.status || "ACTIVE";
          const label =
            userStatusLabels[status as keyof typeof userStatusLabels] || status;
          const variant = status === "ACTIVE" ? "default" : "destructive";
          return <Badge variant={variant}>{label}</Badge>;
        },
      },
      {
        id: "studentTypeName",
        accessorKey: "studentTypeName",
        header: "生徒タイプ",
        cell: ({ row }) =>
          row.original.studentTypeName ? (
            <Badge variant="outline">{row.original.studentTypeName}</Badge>
          ) : (
            "-"
          ),
      },
      {
        id: "gradeYear",
        accessorKey: "gradeYear",
        header: "学年",
        cell: ({ row }) =>
          row.original.gradeYear !== null
            ? `${row.original.gradeYear}年生`
            : "-",
      },
      {
        id: "birthDate",
        accessorKey: "birthDate",
        header: "生年月日",
        cell: ({ row }) => {
          const birthDate = row.original.birthDate;
          if (!birthDate) return "-";
          return new Date(birthDate).toLocaleDateString('ja-JP', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          });
        },
      },
      {
        id: "schoolName",
        accessorKey: "schoolName",
        header: "学校名",
        cell: ({ row }) => row.original.schoolName || "-",
      },
      {
        id: "schoolType",
        accessorKey: "schoolType",
        header: "学校種別",
        cell: ({ row }) => {
          const schoolType = row.original.schoolType;
          if (!schoolType) return "-";
          return <Badge variant="outline">{schoolTypeLabels[schoolType as keyof typeof schoolTypeLabels]}</Badge>;
        },
      },
      {
        id: "examCategory",
        accessorKey: "examCategory",
        header: "受験区分",
        cell: ({ row }) => {
          const examCategory = row.original.examCategory;
          if (!examCategory) return "-";
          return <Badge variant="secondary">{examCategoryLabels[examCategory as keyof typeof examCategoryLabels]}</Badge>;
        },
      },
      {
        id: "examCategoryType",
        accessorKey: "examCategoryType",
        header: "受験区分種別",
        cell: ({ row }) => {
          const examCategoryType = row.original.examCategoryType;
          if (!examCategoryType) return "-";
          return <Badge variant="outline">{examCategoryTypeLabels[examCategoryType as keyof typeof examCategoryTypeLabels]}</Badge>;
        },
      },
      {
        id: "firstChoice",
        accessorKey: "firstChoice",
        header: "第一志望校",
        cell: ({ row }) => row.original.firstChoice || "-",
      },
      {
        id: "secondChoice",
        accessorKey: "secondChoice",
        header: "第二志望校",
        cell: ({ row }) => row.original.secondChoice || "-",
      },
      {
        id: "examDate",
        accessorKey: "examDate",
        header: "試験日",
        cell: ({ row }) => {
          const examDate = row.original.examDate;
          if (!examDate) return "-";
          return new Date(examDate).toLocaleDateString('ja-JP', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit' 
          });
        },
      },
      {
        id: "username",
        accessorKey: "username",
        header: "ユーザー名",
        cell: ({ row }) => row.original.username || "-",
      },
      {
        id: "email",
        accessorKey: "email",
        header: "メールアドレス",
        cell: ({ row }) => row.original.email || "-",
      },
      {
        id: "parentEmail",
        accessorKey: "parentEmail",
        header: "保護者メール",
        cell: ({ row }) => row.original.parentEmail || "-",
      },
      {
        id: "password",
        accessorKey: "password",
        header: "パスワード",
        cell: ({ row }) => {
          const studentId = row.original.studentId;
          const password = row.original.password;
          const isVisible = passwordVisibility[studentId] || false;

          if (!password) return "-";

          const toggleVisibility = () => {
            setPasswordVisibility((prev) => ({
              ...prev,
              [studentId]: !prev[studentId],
            }));
          };

          return (
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm">
                {isVisible
                  ? password
                  : "•".repeat(Math.min(password.length, 8))}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={toggleVisibility}
              >
                {isVisible ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
            </div>
          );
        },
      },
      // Hidden for security reasons - Message IDs should not be exposed
      // {
      //   id: "lineId",
      //   accessorKey: "lineId",
      //   header: "LINE ID",
      //   cell: ({ row }) => row.original.lineId || "-",
      //   meta: {
      //     label: "LINE ID",
      //   },
      // },
      {
        id: "lineConnection",
        accessorKey: "lineId",
        header: "メッセージ連携",
        cell: ({ row }) => {
          const hasLine = !!row.original.lineId;
          const notificationsEnabled = row.original.lineNotificationsEnabled ?? true;

          // Three states: not connected, connected with notifications, connected without notifications
          let iconColor: string;
          let bellIcon: React.ReactNode = null;
          let statusText: string;

          if (!hasLine) {
            iconColor = "text-gray-400";
            statusText = "未連携";
          } else if (notificationsEnabled) {
            iconColor = "text-[#00B900]";
            bellIcon = <Bell className="h-3 w-3 text-blue-600" />;
            statusText = "連携済み";
          } else {
            iconColor = "text-orange-500";
            bellIcon = <BellOff className="h-3 w-3 text-gray-400" />;
            statusText = "通知無効";
          }

          return (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <MessageSquare className={cn("h-4 w-4", iconColor)} />
                {bellIcon}
              </div>
              <span className="text-sm">{statusText}</span>
            </div>
          );
        },
      },
      {
        id: "contactPhones",
        accessorKey: "contactPhones",
        header: "連絡先電話",
        cell: ({ row }) => {
          const phones = row.original.contactPhones;
          if (!phones || phones.length === 0) return "-";
          
          return (
            <div className="space-y-1">
              {phones.map((phone: any, index: number) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">
                    {phone.phoneType === "HOME" ? "自宅" :
                     phone.phoneType === "DAD" ? "父" :
                     phone.phoneType === "MOM" ? "母" : "その他"}:
                  </span>{" "}
                  {phone.phoneNumber}
                  {phone.notes && (
                    <span className="text-muted-foreground ml-1">
                      ({phone.notes})
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        },
      },
      {
        id: "branches",
        accessorKey: "branches",
        header: "校舎",
        cell: ({ row }) => {
          const branches = row.original.branches || [];
          if (branches.length === 0) return "-";

          return (
            <div className="flex flex-wrap gap-1">
              {branches.map((branch) => (
                <Badge key={branch.branchId} variant="outline">
                  {branch.name}
                </Badge>
              ))}
            </div>
          );
        },
      },
      {
        id: "subjectPreferences",
        accessorKey: "subjectPreferences",
        header: "選択科目",
        cell: ({ row }) => (
          <SubjectPreferencesCell
            subjectPreferences={row.original.subjectPreferences || []}
            subjects={subjects}
            subjectTypes={subjectTypes}
          />
        ),
      },
      {
        id: "notes",
        accessorKey: "notes",
        header: "備考",
        cell: ({ row }) => {
          const notes = row.original.notes;
          if (!notes) return "-";
          
          // Truncate long notes and add tooltip
          const maxLength = 50;
          const displayText = notes.length > maxLength 
            ? `${notes.substring(0, maxLength)}...` 
            : notes;
          
          return (
            <span title={notes} className="cursor-help">
              {displayText}
            </span>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          // Type-safe check for _optimistic property
          const isOptimistic = (
            row.original as Student & { _optimistic?: boolean }
          )._optimistic;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setStudentToEdit(row.original)}
                  disabled={isOptimistic}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  編集
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setStudentToDelete(row.original)}
                  disabled={isOptimistic}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 32,
      },
    ],
    [subjects, subjectTypes, studentTypes, passwordVisibility, uniqueBranches]
  );

  const { table } = useDataTable({
    data: filteredData,
    columns,
    pageCount: totalPages,
    keyPrefix: "student_",
    initialState: {
      pagination: { pageSize, pageIndex: page - 1 },
      columnPinning: { right: ["actions"] },
      columnVisibility: getSavedColumnVisibility(),
    },
    getRowId: (row) => row.studentId,
  });

  // Extract pagination state for dependency
  const paginationPageIndex = table.getState().pagination.pageIndex;
  
  // Extract sorting state from table and sync to local state
  const tableSorting = table.getState().sorting;
  React.useEffect(() => {
    setSortingState(tableSorting);
  }, [tableSorting]);

  // Sync pagination state from table to local state
  React.useEffect(() => {
    // Only update page if it's different to avoid infinite loops
    const newPage = paginationPageIndex + 1;
    if (page !== newPage) {
      setPage(newPage);
    }
  }, [paginationPageIndex]);

  // Force table pagination to match page state when page is reset
  React.useEffect(() => {
    const currentTablePage = table.getState().pagination.pageIndex;
    const expectedTablePage = page - 1;
    if (currentTablePage !== expectedTablePage) {
      table.setPageIndex(expectedTablePage);
    }
  }, [page, table]);

  // Extract column visibility state for dependency
  const columnVisibility = table.getState().columnVisibility;

  // Save column visibility to localStorage whenever it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(columnVisibility));
    }
  }, [columnVisibility]);


  const handleDeleteStudent = () => {
    if (studentToDelete) {
      const studentId = getResolvedStudentId(studentToDelete.studentId);
      setStudentToDelete(null);
      deleteStudentMutation.mutate(studentId);
    }
  };

  const handleBatchDelete = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedStudents = selectedRows.map((row) => row.original);

    selectedStudents.forEach((student) => {
      const studentId = getResolvedStudentId(student.studentId);
      deleteStudentMutation.mutate(studentId);
    });

    table.resetRowSelection();
  };

  const handleExport = () => {
    // Get visible columns, excluding LINE-related fields for security/privacy
    const visibleColumns = table
      .getAllColumns()
      .filter((col) =>
        col.getIsVisible() &&
        col.id !== "select" &&
        col.id !== "actions" &&
        !["lineConnection", "lineId", "lineNotificationsEnabled"].includes(col.id)
      )
      .map((col) => col.id);

    // Get current filters - pass all filters
    exportToCSV({
      name: filters.name || undefined,
      status: filters.status || undefined,
      studentType: filters.studentType || undefined,
      gradeYear: filters.gradeYear || undefined,
      branch: filters.branch || undefined,
      subject: filters.subject || undefined,
      lineConnection: filters.lineConnection || undefined,
      schoolType: filters.schoolType || undefined,
      examCategory: filters.examCategory || undefined,
      examCategoryType: filters.examCategoryType || undefined,
      birthDateRange: filters.birthDateRange || undefined,
      examDateRange: filters.examDateRange || undefined,
      columns: visibleColumns,
    });
  };

  const handleImport = () => {
    setIsImportDialogOpen(true);
  };

  const handleImportComplete = () => {
    // Refresh the data after successful import
    // Invalidate the students query to refetch data
    queryClient.invalidateQueries({ queryKey: ["students"] });
    // Reset page to 1 to see newly imported data
    setPage(1);
  };

  // Handle loading state without early return
  if (!studentTypesResponse || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">読み込み中...</div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">生徒管理</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleImport}
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              CSVインポート
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting}
              variant="outline"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? "エクスポート中..." : "CSVエクスポート"}
            </Button>
            <Button onClick={() => setIsCreateDialogOpen(true)}>新規作成</Button>
          </div>
        </div>

        <div className="relative space-y-4">
          <StudentTableToolbar 
            table={table}
            filters={filters}
            setFilters={setFilters}
            studentTypes={studentTypes}
            subjects={subjects}
            uniqueBranches={uniqueBranches}
          >
            {table.getFilteredSelectedRowModel().rows.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={deleteStudentMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                選択した生徒を削除 (
                {table.getFilteredSelectedRowModel().rows.length})
              </Button>
            )}
          </StudentTableToolbar>
          <div className="rounded-md border">
            <UITable>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id} colSpan={header.colSpan}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      データがありません。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </UITable>
          </div>
          <div className="flex flex-col gap-2.5">
            <DataTablePagination table={table} />
          </div>
        </div>
      </div>

      {/* Edit Student Dialog */}
      {studentToEdit && (
        <StudentFormDialog
          open={!!studentToEdit}
          onOpenChange={(open) => !open && setStudentToEdit(null)}
          student={studentToEdit}
        />
      )}

      {/* Create Student Dialog */}
      <StudentFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!studentToDelete}
        onOpenChange={(open) => !open && setStudentToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。生徒「
              {studentToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudent}
              disabled={deleteStudentMutation.isPending}
            >
              {deleteStudentMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <CSVImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="生徒をインポート"
        description="CSVファイルから生徒データを一括インポートします"
        templateUrl="/api/import/students/template"
        importUrl="/api/import/students"
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
