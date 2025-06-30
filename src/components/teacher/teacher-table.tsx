// src/components/teacher/teacher-table.tsx
"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Eye, EyeOff, Trash2, MoreHorizontal, RotateCcw, Download, Upload, Bell, BellOff, MessageSquare } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useTeacherExport } from "@/hooks/useTeacherExport";

import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DataTableDateFilter } from "@/components/data-table/data-table-date-filter";
import { DataTableYearFilter } from "@/components/data-table/data-table-year-filter";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { useDataTable } from "@/hooks/use-data-table";
import { SubjectPreferencesCell } from "@/components/ui/subject-preferences-cell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Column, Table } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
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
import { TeacherFormDialog } from "./teacher-form-dialog";
import { Teacher, useTeachers } from "@/hooks/useTeacherQuery";
import { useAllSubjects } from "@/hooks/useSubjectQuery";
import { useAllSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import { CSVImportDialog } from "@/components/ui/csv-import-dialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTeacherDelete,
  getResolvedTeacherId,
} from "@/hooks/useTeacherMutation";
import { userStatusLabels } from "@/schemas/teacher.schema";

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

// Multi-select filter component for teacher table
interface TeacherTableFilterMultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  title: string;
  options: { value: string; label: string }[];
}

function TeacherTableFilterMultiSelect({
  value,
  onValueChange,
  title,
  options,
}: TeacherTableFilterMultiSelectProps) {
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

// Year filter component for teacher table
interface TeacherTableYearFilterProps {
  value?: { from?: Date; to?: Date };
  onValueChange: (value?: { from?: Date; to?: Date }) => void;
  title: string;
}

function TeacherTableYearFilter({
  value,
  onValueChange,
  title,
}: TeacherTableYearFilterProps) {
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

// Custom toolbar component
interface TeacherTableToolbarProps extends React.ComponentProps<"div"> {
  table: Table<Teacher>;
  filters: {
    name: string;
    status: string[];
    branch: string[];
    subject: string[];
    lineConnection: string[];
    birthDateRange?: { from?: Date; to?: Date };
    phoneNumber: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<{
    name: string;
    status: string[];
    branch: string[];
    subject: string[];
    lineConnection: string[];
    birthDateRange?: { from?: Date; to?: Date };
    phoneNumber: string;
  }>>;
  subjects: any[];
  uniqueBranches: { value: string; label: string }[];
  children?: React.ReactNode;
}

function TeacherTableToolbar({
  table,
  filters,
  setFilters,
  subjects,
  uniqueBranches,
  children,
  className,
  ...props
}: TeacherTableToolbarProps) {
  const hasActiveFilters = React.useMemo(() => {
    return !!(
      filters.name ||
      filters.status.length > 0 ||
      filters.branch.length > 0 ||
      filters.subject.length > 0 ||
      filters.lineConnection.length > 0 ||
      filters.birthDateRange ||
      filters.phoneNumber
    );
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      name: "",
      status: [],
      branch: [],
      subject: [],
      lineConnection: [],
      birthDateRange: undefined,
      phoneNumber: "",
    });
  };

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
        <TeacherTableFilterMultiSelect
          value={filters.status}
          onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          title="ステータス"
          options={Object.entries(userStatusLabels).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <TeacherTableYearFilter
          value={filters.birthDateRange}
          onValueChange={(value) => setFilters(prev => ({ ...prev, birthDateRange: value }))}
          title="生年月日"
        />
        <Input
          placeholder="電話番号で検索..."
          value={filters.phoneNumber}
          onChange={(event) => setFilters(prev => ({ ...prev, phoneNumber: event.target.value }))}
          className="h-8 w-40 lg:w-56"
        />
        <TeacherTableFilterMultiSelect
          value={filters.branch}
          onValueChange={(value) => setFilters(prev => ({ ...prev, branch: value }))}
          title="校舎"
          options={uniqueBranches}
        />
        <TeacherTableFilterMultiSelect
          value={filters.subject}
          onValueChange={(value) => setFilters(prev => ({ ...prev, subject: value }))}
          title="担当科目"
          options={subjects.map((subject) => ({
            value: subject.name,
            label: subject.name,
          }))}
        />
        <TeacherTableFilterMultiSelect
          value={filters.lineConnection}
          onValueChange={(value) => setFilters(prev => ({ ...prev, lineConnection: value }))}
          title="メッセージ連携"
          options={[
            { value: "connected_enabled", label: "連携済み (通知有効)" },
            { value: "connected_disabled", label: "連携済み (通知無効)" },
            { value: "not_connected", label: "未連携" }
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

export function TeacherTable() {
  // Storage keys for persistence
  const FILTERS_STORAGE_KEY = "teacher_filters";
  const COLUMN_VISIBILITY_STORAGE_KEY = "teacher_column_visibility";

  // Initialize filters with localStorage values or defaults
  const [filters, setFilters] = React.useState<{
    name: string;
    status: string[];
    branch: string[];
    subject: string[];
    lineConnection: string[];
    birthDateRange?: { from?: Date; to?: Date };
    phoneNumber: string;
  }>(() => {
    if (typeof window !== 'undefined') {
      const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (savedFilters) {
        try {
          const parsed = JSON.parse(savedFilters);
          // Ensure all properties have default values
          return {
            name: parsed.name || "",
            status: parsed.status || [],
            branch: parsed.branch || [],
            subject: parsed.subject || [],
            lineConnection: parsed.lineConnection || [],
            birthDateRange: parsed.birthDateRange ? {
              from: parsed.birthDateRange.from ? new Date(parsed.birthDateRange.from) : undefined,
              to: parsed.birthDateRange.to ? new Date(parsed.birthDateRange.to) : undefined
            } : undefined,
            phoneNumber: parsed.phoneNumber || "",
          };
        } catch (error) {
          console.error('Error parsing saved filters:', error);
        }
      }
    }
    return {
      name: "",
      status: [] as string[],
      branch: [] as string[],
      subject: [] as string[],
      lineConnection: [] as string[],
      birthDateRange: undefined,
      phoneNumber: "",
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
    console.log("[TeacherTable] Filters changed:", filters);
    if (typeof window !== 'undefined') {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    }
  }, [filters]);

  // Reset to first page when filters change
  React.useEffect(() => {
    console.log("[TeacherTable] Resetting page to 1 due to filter change");
    setPage(1);
  }, [filters]);

  const debouncedName = useDebounce(filters.name, 300);
  const debouncedPhoneNumber = useDebounce(filters.phoneNumber, 300);
  const [page, setPage] = React.useState(1);
  const [teacherToEdit, setTeacherToEdit] = React.useState<Teacher | null>(
    null
  );
  const [teacherToDelete, setTeacherToDelete] = React.useState<Teacher | null>(
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
  const { data: subjects = [] } = useAllSubjects();
  const { data: subjectTypes = [] } = useAllSubjectTypes();
  const deleteTeacherMutation = useTeacherDelete();
  const { exportToCSV, isExporting } = useTeacherExport();

  // Parse branch names back to IDs (temporary solution)
  const branchIds = React.useMemo(() => {
    if (filters.branch.length === 0) return undefined;
    // For now, we'll pass branch names as IDs since we don't have a branch lookup
    // The API will need to handle this appropriately
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

  // Build query parameters for useTeachers
  const queryParams = React.useMemo(() => ({
    page,
    limit: pageSize,
    name: debouncedName || undefined,
    statuses: filters.status.length > 0 ? filters.status : undefined,
    birthDateFrom: filters.birthDateRange?.from,
    birthDateTo: filters.birthDateRange?.to,
    phoneNumber: debouncedPhoneNumber || undefined,
    branchIds: branchIds,
    subjectIds: subjectIds,
    lineConnection: filters.lineConnection.length > 0 ? filters.lineConnection : undefined,
    sortBy: sortingState[0]?.id,
    sortOrder: sortingState[0]?.desc ? "desc" : "asc",
  }), [page, pageSize, debouncedName, filters.status, filters.birthDateRange, debouncedPhoneNumber, branchIds, subjectIds, filters.lineConnection, sortingState]);

  // Debug logging for query params
  React.useEffect(() => {
    console.log("[TeacherTable] Query params being sent to useTeachers:", queryParams);
  }, [queryParams]);

  const { data: teachers, isLoading } = useTeachers(queryParams);


  // No client-side filtering needed - all filtering is done server-side
  const filteredData = teachers?.data || [];

  const totalCount = teachers?.pagination.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Extract unique branches from current data
  const uniqueBranches = React.useMemo(() => {
    const branches = new Map<string, string>();
    (teachers?.data || []).forEach((teacher) => {
      teacher.branches?.forEach((branch) => {
        branches.set(branch.branchId, branch.name);
      });
    });
    return Array.from(branches.values()).map((name) => ({
      value: name,
      label: name,
    }));
  }, [teachers?.data]);

  const columns = React.useMemo<ColumnDef<Teacher>[]>(
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
        id: "contactPhones",
        accessorKey: "contactPhones",
        header: "連絡先電話",
        cell: ({ row }) => {
          const phones = row.original.contactPhones;
          if (!phones || phones.length === 0) {
            // Fallback to legacy phoneNumber field with notes
            const phoneNumber = row.original.phoneNumber;
            const phoneNotes = row.original.phoneNotes;
            if (phoneNumber) {
              return (
                <div className="text-sm">
                  {phoneNumber}
                  {phoneNotes && (
                    <span className="text-muted-foreground ml-1">
                      ({phoneNotes})
                    </span>
                  )}
                </div>
              );
            }
            return "-";
          }
          
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
        id: "password",
        accessorKey: "password",
        header: "パスワード",
        cell: ({ row }) => {
          const teacherId = row.original.teacherId;
          const password = row.original.password;
          const isVisible = passwordVisibility[teacherId] || false;

          if (!password) return "-";

          const toggleVisibility = () => {
            setPasswordVisibility((prev) => ({
              ...prev,
              [teacherId]: !prev[teacherId],
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
      // Hidden for security reasons - LINE IDs should not be exposed
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
        header: "担当科目",
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
            row.original as Teacher & { _optimistic?: boolean }
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
                  onClick={() => setTeacherToEdit(row.original)}
                  disabled={isOptimistic}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  編集
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setTeacherToDelete(row.original)}
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
    [subjects, subjectTypes, passwordVisibility, uniqueBranches]
  );

  const { table } = useDataTable({
    data: filteredData,
    columns,
    pageCount: totalPages,
    keyPrefix: "teacher_",
    initialState: {
      pagination: { pageSize, pageIndex: page - 1 },
      columnPinning: { right: ["actions"] },
      columnVisibility: getSavedColumnVisibility(),
    },
    getRowId: (row) => row.teacherId,
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

  const handleDeleteTeacher = () => {
    if (teacherToDelete) {
      const teacherId = getResolvedTeacherId(teacherToDelete.teacherId);
      setTeacherToDelete(null);
      deleteTeacherMutation.mutate(teacherId);
    }
  };

  const handleBatchDelete = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const selectedTeachers = selectedRows.map((row) => row.original);

    selectedTeachers.forEach((teacher) => {
      const teacherId = getResolvedTeacherId(teacher.teacherId);
      deleteTeacherMutation.mutate(teacherId);
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
      branch: filters.branch || undefined,
      subject: filters.subject || undefined,
      lineConnection: filters.lineConnection || undefined,
      birthDateRange: filters.birthDateRange || undefined,
      columns: visibleColumns,
    });
  };

  const handleImport = () => {
    setIsImportDialogOpen(true);
  };

  const handleImportComplete = () => {
    // Refresh the data after successful import
    // Invalidate the teachers query to refetch data
    queryClient.invalidateQueries({ queryKey: ["teachers"] });
    // Reset page to 1 to see newly imported data
    setPage(1);
  };

  // Handle loading state without early return
  if (isLoading && !teachers) {
    return (
      <div className="flex items-center justify-center p-8">読み込み中...</div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">教師管理</h2>
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

        <TeacherTableToolbar 
          table={table}
          filters={filters}
          setFilters={setFilters}
          subjects={subjects}
          uniqueBranches={uniqueBranches}
        >
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={deleteTeacherMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              選択した教師を削除 (
              {table.getFilteredSelectedRowModel().rows.length})
            </Button>
          )}
        </TeacherTableToolbar>

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

        <DataTablePagination table={table} />
      </div>

      {/* Edit Teacher Dialog */}
      {teacherToEdit && (
        <TeacherFormDialog
          open={!!teacherToEdit}
          onOpenChange={(open) => !open && setTeacherToEdit(null)}
          teacher={teacherToEdit}
        />
      )}

      {/* Create Teacher Dialog */}
      <TeacherFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!teacherToDelete}
        onOpenChange={(open) => !open && setTeacherToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。教師「
              {teacherToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeacher}
              disabled={deleteTeacherMutation.isPending}
            >
              {deleteTeacherMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <CSVImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="教師をインポート"
        description="CSVファイルから教師データを一括インポートします"
        templateUrl="/api/import/teachers/template"
        importUrl="/api/import/teachers"
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
