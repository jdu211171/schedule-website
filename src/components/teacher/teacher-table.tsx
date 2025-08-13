// src/components/teacher/teacher-table.tsx
"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, MoreHorizontal, Download, Upload, Plus, Bell, BellOff, MessageSquare } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useTeacherExport } from "@/hooks/useTeacherExport";

import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { DataTableFacetedFilter } from "@/components/data-table/data-table-faceted-filter";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { GenericDraggableTable } from "@/components/data-table-v0/generic-draggable-table-v0";
import { GenericInlineEditableCell } from "@/components/data-table-v0/generic-inline-editable-cell-v0";
import { GenericSelectEditableCell } from "@/components/data-table-v0/generic-select-editable-cell-v0";
import { GenericPasswordEditableCell } from "@/components/data-table-v0/generic-password-editable-cell-v0";
import { SubjectPreferencesCell } from "@/components/ui/subject-preferences-cell";
import { flexRender } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import type { Column, Table } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetcher } from "@/lib/fetcher";
import {
  useTeacherDelete,
  useTeacherUpdate,
  getResolvedTeacherId,
} from "@/hooks/useTeacherMutation";
import { userStatusLabels } from "@/schemas/teacher.schema";

// Import types to ensure proper column meta support
import "@/components/data-table/types";
import { useStateDataTable } from "@/hooks/use-state-data-table";

// Custom toolbar component without reset button
interface TeacherTableToolbarProps<TData> extends React.ComponentProps<"div"> {
  table: Table<TData>;
  children?: React.ReactNode;
}

function TeacherTableToolbar<TData>({
  table,
  children,
  className,
  ...props
}: TeacherTableToolbarProps<TData>) {
  const columns = React.useMemo(
    () => table.getAllColumns().filter((column) => column.getCanFilter()),
    [table],
  );

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
          <TeacherTableToolbarFilter key={column.id} column={column} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        {children}
        <DataTableViewOptions table={table} />
      </div>
    </div>
  );
}

interface TeacherTableToolbarFilterProps<TData> {
  column: Column<TData>;
}

function TeacherTableToolbarFilter<TData>({
  column,
}: TeacherTableToolbarFilterProps<TData>) {
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

export function TeacherTable() {
  // Inline component to render message link status using per-channel links
  function TeacherMessageLinkStatus({
    teacherId,
    legacyLineId,
    legacyNotificationsEnabled,
  }: { teacherId: string; legacyLineId: string | null; legacyNotificationsEnabled?: boolean | null }) {
    const { data } = useQuery<{ data: Array<{ enabled: boolean }> }>({
      queryKey: ["teacher-line-links", teacherId],
      queryFn: () => fetcher(`/api/teachers/${teacherId}/line-links?r=${Date.now()}`, { cache: "no-store" }),
      staleTime: 30_000,
    });

    const hasActiveLink = !!data?.data?.some((l) => l.enabled);
    const hasAnyLink = !!data?.data?.length;

    // Determine effective status: prefer per-channel active link; fallback to legacy fields
    const isLinked = hasActiveLink || !!legacyLineId || hasAnyLink;
    const notificationsEnabled = legacyNotificationsEnabled ?? true;

    let iconColor: string;
    let bellIcon: React.ReactNode = null;
    let statusText: string;

    if (!isLinked) {
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
  }
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
  const [teacherToEdit, setTeacherToEdit] = React.useState<Teacher | null>(
    null
  );
  const [teacherToDelete, setTeacherToDelete] = React.useState<Teacher | null>(
    null
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);

  const [pageSize, setPageSize] = React.useState(10);

  // Load data
  const { data: subjects = [] } = useAllSubjects();
  const { data: subjectTypes = [] } = useAllSubjectTypes();
  const deleteTeacherMutation = useTeacherDelete();
  const updateTeacherMutation = useTeacherUpdate();
  const { exportToCSV, isExporting } = useTeacherExport();

  // Parse filter values for API call
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

  const { data: teachers, isLoading } = useTeachers({
    page,
    limit: pageSize,
    name: debouncedName || undefined,
    status: filters.status.length > 0 ? filters.status[0] : undefined,
  });

  // Handle inline cell updates
  const handleCellUpdate = React.useCallback(
    (teacherId: string, field: string, value: string) => {
      updateTeacherMutation.mutate({
        teacherId,
        [field]: value,
      });
    },
    [updateTeacherMutation]
  );

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
        meta: {
          label: "名前",
        },
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.name}
            onSubmit={(value) => handleCellUpdate(row.original.teacherId, "name", value)}
            placeholder="-"
            readOnly={true}
          />
        ),
      },
      {
        id: "kanaName",
        accessorKey: "kanaName",
        header: "カナ",
        meta: {
          label: "カナ",
        },
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.kanaName}
            onSubmit={(value) => handleCellUpdate(row.original.teacherId, "kanaName", value)}
            placeholder="カナを入力"
          />
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "ステータス",
        meta: {
          label: "ステータス",
        },
        cell: ({ row }) => {
          const status = row.original.status || "ACTIVE";
          return (
            <GenericSelectEditableCell
              value={status}
              options={Object.entries(userStatusLabels).map(([value, label]) => ({ value, label }))}
              onSubmit={(value) => handleCellUpdate(row.original.teacherId, "status", value)}
            />
          );
        },
      },
      {
        id: "username",
        accessorKey: "username",
        header: "ユーザー名",
        meta: {
          label: "ユーザー名",
        },
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.username}
            onSubmit={(value) => handleCellUpdate(row.original.teacherId, "username", value)}
            placeholder="-"
            readOnly={true}
          />
        ),
      },
      {
        id: "email",
        accessorKey: "email",
        header: "メールアドレス",
        meta: {
          label: "メールアドレス",
        },
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.email}
            onSubmit={(value) => handleCellUpdate(row.original.teacherId, "email", value)}
            placeholder="-"
            readOnly={true}
          />
        ),
      },
      {
        id: "birthDate",
        accessorKey: "birthDate",
        header: "生年月日",
        meta: {
          label: "生年月日",
        },
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
        meta: {
          label: "連絡先電話",
        },
        cell: ({ row }) => {
          const phoneNumber = row.original.phoneNumber;
          const phoneNotes = row.original.phoneNotes;
          // For now, use legacy phoneNumber field for editing
          return (
            <div className="space-y-1">
              <GenericInlineEditableCell
                value={phoneNumber}
                onSubmit={(value) => handleCellUpdate(row.original.teacherId, "phoneNumber", value)}
                placeholder="-"
                readOnly={true}
              />
              {phoneNotes && (
                <div className="text-xs text-muted-foreground">
                  {phoneNotes}
                </div>
              )}
            </div>
          );
        },
      },
      {
        id: "password",
        accessorKey: "password",
        header: "パスワード",
        meta: {
          label: "パスワード",
        },
        cell: ({ row }) => (
          <GenericPasswordEditableCell
            value={row.original.password}
            onSubmit={(value) => handleCellUpdate(row.original.teacherId, "password", value)}
            editable={false}
          />
        ),
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
        meta: {
          label: "メッセージ連携",
          variant: "multiSelect",
          options: [
            { value: "connected_enabled", label: "連携済み (通知有効)" },
            { value: "connected_disabled", label: "連携済み (通知無効)" },
            { value: "not_connected", label: "未連携" }
          ],
        },
        enableColumnFilter: true,
        cell: ({ row }) => (
          <TeacherMessageLinkStatus
            teacherId={row.original.teacherId}
            legacyLineId={row.original.lineId}
            legacyNotificationsEnabled={row.original.lineNotificationsEnabled}
          />
        ),
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
        header: "担当科目",
        cell: ({ row }) => (
          <SubjectPreferencesCell
            subjectPreferences={row.original.subjectPreferences || []}
            subjects={subjects}
            subjectTypes={subjectTypes}
          />
        ),
        meta: {
          label: "担当科目",
          variant: "multiSelect",
          options: subjects.map((subject) => ({
            value: subject.name,
            label: subject.name,
          })),
        },
        enableColumnFilter: true,
      },
      {
        id: "notes",
        accessorKey: "notes",
        header: "備考",
        meta: {
          label: "備考",
        },
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.notes}
            onSubmit={(value) => handleCellUpdate(row.original.teacherId, "notes", value)}
            placeholder="備考を入力"
          />
        ),
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
    [subjects, subjectTypes, uniqueBranches, handleCellUpdate]
  );

  // No client-side filtering needed - all filtering is done server-side
  const filteredData = teachers?.data || [];

  const totalCount = teachers?.pagination.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const { table } = useStateDataTable({
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
        ...(filters.branch.length > 0 ? [{ id: 'branches', value: filters.branch }] : []),
        ...(filters.subject.length > 0 ? [{ id: 'subjectPreferences', value: filters.subject }] : []),
        ...(filters.lineConnection.length > 0 ? [{ id: 'lineConnection', value: filters.lineConnection }] : []),
      ],
    },
    getRowId: (row) => row.teacherId,
    enableColumnFilters: true,
  });

  // Save column visibility to localStorage whenever it changes
  React.useEffect(() => {
    const columnVisibility = table.getState().columnVisibility;
    if (typeof window !== 'undefined' && columnVisibility) {
      localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(columnVisibility));
    }
  }, [table.getState().columnVisibility]);

  // Sync table column filters with local filters state
  React.useEffect(() => {
    const columnFilters = table.getState().columnFilters;
    const newFilters = {
      name: "",
      status: [] as string[],
      branch: [] as string[],
      subject: [] as string[],
      lineConnection: [] as string[],
    };

    columnFilters.forEach((filter) => {
      switch (filter.id) {
        case 'name':
          newFilters.name = filter.value as string;
          break;
        case 'status':
          newFilters.status = filter.value as string[];
          break;
        case 'branches':
          newFilters.branch = filter.value as string[];
          break;
        case 'subjectPreferences':
          newFilters.subject = filter.value as string[];
          break;
        case 'lineConnection':
          newFilters.lineConnection = filter.value as string[];
          break;
      }
    });

    setFilters(newFilters);
  }, [table.getState().columnFilters]);

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedName, filters.status, filters.branch, filters.subject, filters.lineConnection]);

  // Handle pagination changes from the table
  const tablePagination = table.getState().pagination;
  React.useEffect(() => {
    // Sync page index (table uses 0-based, our state uses 1-based)
    if (tablePagination.pageIndex + 1 !== page) {
      setPage(tablePagination.pageIndex + 1);
    }

    // Sync page size
    if (tablePagination.pageSize !== pageSize) {
      setPageSize(tablePagination.pageSize);
      setPage(1); // Reset to first page when page size changes
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tablePagination.pageIndex, tablePagination.pageSize]);

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
    const visibleColumns = table
      .getAllColumns()
      .filter((col) =>
        col.getIsVisible() &&
        col.id !== "select" &&
        col.id !== "actions" &&
        !["lineConnection", "lineId", "lineNotificationsEnabled"].includes(col.id)
      )
      .map((col) => col.id);

    exportToCSV({
      name: debouncedName || undefined,
      columns: visibleColumns,
    });
  };

  const handleImport = () => {
    setIsImportDialogOpen(true);
  };

  const handleImportComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["teachers"] });
    setPage(1);
  };


  if (isLoading && !teachers) {
    return (
      <div className="flex items-center justify-center p-8">読み込み中...</div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">講師管理</h2>
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
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              新規作成
            </Button>
          </div>
        </div>

        <TeacherTableToolbar table={table} />

        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={deleteTeacherMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              選択した講師を削除 ({table.getFilteredSelectedRowModel().rows.length})
            </Button>
          </div>
        )}

        <div className="rounded-md border">
          <GenericDraggableTable
            table={table}
            dataIds={teachers?.data.map(t => t.teacherId) || []}
            onDragEnd={() => {}}
            columnsLength={columns.length}
          />
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
              この操作は元に戻せません。講師「
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
        title="講師をインポート"
        description="CSVファイルから講師データを一括インポートします"
        templateUrl="/api/import/teachers/template"
        importUrl="/api/import/teachers"
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
