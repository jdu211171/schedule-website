// src/components/student/student-table.tsx
"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Eye, EyeOff, Trash2, MoreHorizontal, RotateCcw, Download, Upload } from "lucide-react";
import { LineIcon } from "@/components/icons/line-icon";
import { useDebounce } from "@/hooks/use-debounce";
import { useStudentExport } from "@/hooks/useStudentExport";

import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DataTableDateFilter } from "@/components/data-table/data-table-date-filter";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTableSliderFilter } from "@/components/data-table/data-table-slider-filter";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { useDataTable } from "@/hooks/use-data-table";
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
import { userStatusLabels } from "@/schemas/student.schema";

// Import types to ensure proper column meta support
import "@/components/data-table/types";

// Custom toolbar component without reset button
interface StudentTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  children?: React.ReactNode;
}

function StudentTableToolbar<TData>({
  table,
  children,
  className,
  ...props
}: StudentTableToolbarProps<TData>) {
  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table],
  );

  const hasActiveFilters = table.getState().columnFilters.length > 0;

  const handleResetFilters = () => {
    table.resetColumnFilters();
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
        {columns.map((column) => (
          <StudentTableToolbarFilter key={column.id} column={column} />
        ))}
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

interface StudentTableToolbarFilterProps<TData> {
  column: Column<TData>;
}

function StudentTableToolbarFilter<TData>({
  column,
}: StudentTableToolbarFilterProps<TData>) {
  const columnMeta = column.columnDef.meta;

  const onFilterRender = React.useCallback(() => {
    if (!columnMeta?.variant) return null;

    switch (columnMeta.variant) {
      case "text":
        return (
          <Input
            placeholder={columnMeta.placeholder ?? columnMeta.label}
            value={(column.getFilterValue() as string) ?? ""}
            onChange={(event) => column.setFilterValue(event.target.value)}
            className="h-8 w-40 lg:w-56"
          />
        );

      case "number":
        return (
          <div className="relative">
            <Input
              type="number"
              inputMode="numeric"
              placeholder={columnMeta.placeholder ?? columnMeta.label}
              value={(column.getFilterValue() as string) ?? ""}
              onChange={(event) => column.setFilterValue(event.target.value)}
              className={cn("h-8 w-[120px]", columnMeta.unit && "pr-8")}
            />
            {columnMeta.unit && (
              <span className="absolute top-0 right-0 bottom-0 flex items-center rounded-r-md bg-accent px-2 text-muted-foreground text-sm">
                {columnMeta.unit}
              </span>
            )}
          </div>
        );

      case "range":
        return (
          <DataTableSliderFilter
            column={column}
            title={columnMeta.label ?? column.id}
          />
        );

      case "date":
      case "dateRange":
        return (
          <DataTableDateFilter
            column={column}
            title={columnMeta.label ?? column.id}
            multiple={columnMeta.variant === "dateRange"}
          />
        );

      case "select":
      case "multiSelect":
        return (
          <DataTableFacetedFilter
            column={column}
            title={columnMeta.label ?? column.id}
            options={columnMeta.options ?? []}
            multiple={columnMeta.variant === "multiSelect"}
          />
        );

      default:
        return null;
    }
  }, [column, columnMeta]);

  return onFilterRender();
}

export function StudentTable() {
  // Storage keys for persistence
  const FILTERS_STORAGE_KEY = "student_filters";
  const COLUMN_VISIBILITY_STORAGE_KEY = "student_column_visibility";

  // Initialize filters with localStorage values or defaults
  const [filters, setFilters] = React.useState<{
    name: string;
    status: string[];
    studentType: string[];
    gradeYear: string[];
    branch: string[];
    subject: string[];
    lineConnection: string[];
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
            studentType: parsed.studentType || [],
            gradeYear: parsed.gradeYear || [],
            branch: parsed.branch || [],
            subject: parsed.subject || [],
            lineConnection: parsed.lineConnection || [],
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
    if (typeof window !== 'undefined') {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    }
  }, [filters]);


  const debouncedName = useDebounce(filters.name, 300);
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

  // Parse studentType names back to IDs for API call
  const studentTypeIds = React.useMemo(() => {
    if (filters.studentType.length === 0) return undefined;
    return studentTypes
      .filter((type) => filters.studentType.includes(type.name))
      .map((type) => type.studentTypeId);
  }, [filters.studentType, studentTypes]);

  const { data: students, isLoading } = useStudents({
    page,
    limit: pageSize,
    name: debouncedName || undefined,
    studentTypeIds: studentTypeIds, // Use the new multi-select parameter
    status: filters.status[0] || undefined, // API still only supports single status
  });

  // Create lookup maps for better performance
  const subjectIdToName = React.useMemo(
    () => new Map(subjects.map((s) => [s.subjectId, s.name])),
    [subjects]
  );

  // Convert filter arrays to Sets for O(1) lookup
  const statusSet = React.useMemo(() => new Set(filters.status), [filters.status]);
  const gradeYearSet = React.useMemo(() => new Set(filters.gradeYear), [filters.gradeYear]);
  const branchSet = React.useMemo(() => new Set(filters.branch), [filters.branch]);
  const subjectSet = React.useMemo(() => new Set(filters.subject), [filters.subject]);
  const lineConnectionSet = React.useMemo(() => new Set(filters.lineConnection), [filters.lineConnection]);

  // Filter data client-side only for filters not supported by the API
  const filteredData = React.useMemo(() => {
    const data = students?.data || [];

    // Early return if no client-side filters
    if (
      gradeYearSet.size === 0 &&
      branchSet.size === 0 &&
      subjectSet.size === 0 &&
      lineConnectionSet.size === 0 &&
      filters.status.length <= 1 // API supports single status
    ) {
      return data;
    }

    return data.filter((student) => {
      // Status filter (only if multiple statuses selected)
      if (filters.status.length > 1 && !statusSet.has(student.status || "ACTIVE")) {
        return false;
      }

      // Grade year filter
      if (gradeYearSet.size > 0 && (student.gradeYear === null || !gradeYearSet.has(student.gradeYear.toString()))) {
        return false;
      }

      // Branch filter
      if (branchSet.size > 0) {
        if (!student.branches || !student.branches.some((b) => branchSet.has(b.name))) {
          return false;
        }
      }

      // Subject filter
      if (subjectSet.size > 0) {
        if (!student.subjectPreferences) return false;

        const hasMatchingSubject = student.subjectPreferences.some((pref) => {
          const subjectName = subjectIdToName.get(pref.subjectId);
          return subjectName && subjectSet.has(subjectName);
        });

        if (!hasMatchingSubject) return false;
      }

      // LINE connection filter
      if (lineConnectionSet.size > 0) {
        const hasLine = !!student.lineId;
        const connectionStatus = hasLine ? "connected" : "not_connected";
        if (!lineConnectionSet.has(connectionStatus)) {
          return false;
        }
      }

      return true;
    });
  }, [
    filters.status,
    statusSet,
    gradeYearSet,
    branchSet,
    subjectSet,
    lineConnectionSet,
    students?.data,
    subjectIdToName,
  ]);

  const totalCount = students?.pagination.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

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
        meta: {
          label: "名前",
          placeholder: "名前で検索...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "kanaName",
        accessorKey: "kanaName",
        header: "カナ",
        cell: ({ row }) => row.original.kanaName || "-",
        meta: {
          label: "カナ",
        },
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
        meta: {
          label: "ステータス",
          variant: "multiSelect",
          options: Object.entries(userStatusLabels).map(([value, label]) => ({
            value,
            label,
          })),
        },
        enableColumnFilter: true,
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
        meta: {
          label: "生徒タイプ",
          variant: "multiSelect",
          options: studentTypes.map((type) => ({
            value: type.name,
            label: type.name,
          })),
        },
        enableColumnFilter: true,
      },
      {
        id: "gradeYear",
        accessorKey: "gradeYear",
        header: "学年",
        cell: ({ row }) =>
          row.original.gradeYear !== null
            ? `${row.original.gradeYear}年生`
            : "-",
        meta: {
          label: "学年",
          variant: "multiSelect",
          options: [1, 2, 3, 4, 5, 6].map((year) => ({
            value: year.toString(),
            label: `${year}年生`,
          })),
        },
        enableColumnFilter: true,
      },
      {
        id: "username",
        accessorKey: "username",
        header: "ユーザー名",
        cell: ({ row }) => row.original.username || "-",
        meta: {
          label: "ユーザー名",
        },
      },
      {
        id: "email",
        accessorKey: "email",
        header: "メールアドレス",
        cell: ({ row }) => row.original.email || "-",
        meta: {
          label: "メールアドレス",
        },
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
        meta: {
          label: "パスワード",
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
        header: "LINE連携",
        cell: ({ row }) => {
          const hasLine = !!row.original.lineId;
          return (
            <div className="flex items-center gap-2">
              <LineIcon
                className={cn(
                  "h-4 w-4",
                  hasLine ? "text-[#00B900]" : "text-gray-400"
                )}
              />
              <span className="text-sm">
                {hasLine ? "連携済み" : "未連携"}
              </span>
            </div>
          );
        },
        meta: {
          label: "LINE連携",
          variant: "multiSelect",
          options: [
            { value: "connected", label: "連携済み" },
            { value: "not_connected", label: "未連携" }
          ],
        },
        enableColumnFilter: true,
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
        meta: {
          label: "校舎",
          variant: "multiSelect",
          options: uniqueBranches,
        },
        enableColumnFilter: true,
      },
      {
        id: "subjectPreferences",
        accessorKey: "subjectPreferences",
        header: "選択科目",
        cell: ({ row }) => {
          const subjectPreferences = row.original.subjectPreferences || [];
          if (subjectPreferences.length === 0) return "-";

          return (
            <div className="space-y-1">
              {subjectPreferences.map((preference) => {
                const subject = subjects.find(
                  (s) => s.subjectId === preference.subjectId
                );
                const types = subjectTypes.filter((t) =>
                  preference.subjectTypeIds.includes(t.subjectTypeId)
                );

                return (
                  <div
                    key={preference.subjectId}
                    className="flex flex-wrap gap-1"
                  >
                    <Badge variant="secondary" className="text-xs">
                      {subject?.name || preference.subjectId}
                    </Badge>
                    {types.map((type) => (
                      <Badge
                        key={type.subjectTypeId}
                        variant="outline"
                        className="text-xs"
                      >
                        {type.name}
                      </Badge>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        },
        meta: {
          label: "選択科目",
          variant: "multiSelect",
          options: subjects.map((subject) => ({
            value: subject.name,
            label: subject.name,
          })),
        },
        enableColumnFilter: true,
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
    initialState: {
      pagination: { pageSize, pageIndex: page - 1 },
      columnPinning: { right: ["actions"] },
      columnVisibility: getSavedColumnVisibility(),
      columnFilters: [
        ...(filters.name ? [{ id: 'name', value: filters.name }] : []),
        ...(filters.status.length > 0 ? [{ id: 'status', value: filters.status }] : []),
        ...(filters.studentType.length > 0 ? [{ id: 'studentTypeName', value: filters.studentType }] : []),
        ...(filters.gradeYear.length > 0 ? [{ id: 'gradeYear', value: filters.gradeYear }] : []),
        ...(filters.branch.length > 0 ? [{ id: 'branches', value: filters.branch }] : []),
        ...(filters.subject.length > 0 ? [{ id: 'subjectPreferences', value: filters.subject }] : []),
        ...(filters.lineConnection.length > 0 ? [{ id: 'lineConnection', value: filters.lineConnection }] : []),
      ],
    },
    getRowId: (row) => row.studentId,
    enableColumnFilters: true,
  });

  // Extract pagination state for dependency
  const paginationPageIndex = table.getState().pagination.pageIndex;

  // Extract column filters state for proper reactivity
  const columnFilters = table.getState().columnFilters;

  React.useEffect(() => {
    setPage(paginationPageIndex + 1);
  }, [paginationPageIndex]);

  // Extract column visibility state for dependency
  const columnVisibility = table.getState().columnVisibility;

  // Save column visibility to localStorage whenever it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(columnVisibility));
    }
  }, [columnVisibility]);

  // Handle column filter changes
  React.useEffect(() => {
    // If no column filters, this is a reset
    if (columnFilters.length === 0) {
      const defaultFilters = {
        name: "",
        status: [],
        studentType: [],
        gradeYear: [],
        branch: [],
        subject: [],
        lineConnection: [],
      };
      setFilters(defaultFilters);
      // Clear localStorage when resetting
      if (typeof window !== 'undefined') {
        localStorage.removeItem(FILTERS_STORAGE_KEY);
      }
      setPage(1);
      return;
    }

    // Build new filters from column filters
    const newFilters = {
      name: "",
      status: [] as string[],
      studentType: [] as string[],
      gradeYear: [] as string[],
      branch: [] as string[],
      subject: [] as string[],
      lineConnection: [] as string[],
    };

    // Set the active filters
    columnFilters.forEach((filter) => {
      if (filter.id === 'name') {
        newFilters.name = filter.value as string || "";
      } else if (filter.id === 'status') {
        newFilters.status = filter.value as string[] || [];
      } else if (filter.id === 'studentTypeName') {
        newFilters.studentType = filter.value as string[] || [];
      } else if (filter.id === 'gradeYear') {
        newFilters.gradeYear = filter.value as string[] || [];
      } else if (filter.id === 'branches') {
        newFilters.branch = filter.value as string[] || [];
      } else if (filter.id === 'subjectPreferences') {
        newFilters.subject = filter.value as string[] || [];
      } else if (filter.id === 'lineConnection') {
        newFilters.lineConnection = filter.value as string[] || [];
      }
    });

    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, [columnFilters]);


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
    // Get visible columns
    const visibleColumns = table
      .getAllColumns()
      .filter((col) => col.getIsVisible() && col.id !== "select" && col.id !== "actions")
      .map((col) => col.id);

    // Get current filters - pass all filters
    exportToCSV({
      name: filters.name || undefined,
      status: filters.status || undefined,
      studentType: filters.studentType || undefined,
      gradeYear: filters.gradeYear || undefined,
      branch: filters.branch || undefined,
      subject: filters.subject || undefined,
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
          <StudentTableToolbar table={table}>
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
