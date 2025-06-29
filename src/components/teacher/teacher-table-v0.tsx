// src/components/teacher/teacher-table-v0.tsx
"use client";

import * as React from "react";
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import { Pencil, Trash2, MoreHorizontal, Download, Upload, Plus } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useTeacherExport } from "@/hooks/useTeacherExport";
import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { GenericDraggableTable } from "@/components/data-table-v0/generic-draggable-table-v0";
import { GenericTablePagination } from "@/components/data-table-v0/generic-table-pagination-v0";
import { GenericTableToolbar } from "@/components/data-table-v0/generic-table-toolbar-v0";
import { GenericInlineEditableCell } from "@/components/data-table-v0/generic-inline-editable-cell-v0";
import { GenericSelectEditableCell } from "@/components/data-table-v0/generic-select-editable-cell-v0";
import { GenericPasswordEditableCell } from "@/components/data-table-v0/generic-password-editable-cell-v0";
import { SubjectPreferencesCell } from "@/components/ui/subject-preferences-cell";
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
import { useQueryClient } from "@tanstack/react-query";
import {
  useTeacherDelete,
  useTeacherUpdate,
  getResolvedTeacherId,
} from "@/hooks/useTeacherMutation";
import { userStatusLabels } from "@/schemas/teacher.schema";

export function TeacherTableV0() {
  const [page, setPage] = React.useState(1);
  const [teacherToEdit, setTeacherToEdit] = React.useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = React.useState<Teacher | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const queryClient = useQueryClient();
  const [isImportDialogOpen, setIsImportDialogOpen] = React.useState(false);
  
  // Table state
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [searchValue, setSearchValue] = React.useState("");

  const pageSize = 10;
  const debouncedName = useDebounce(searchValue, 300);

  // Load data
  const { data: subjects = [] } = useAllSubjects();
  const { data: subjectTypes = [] } = useAllSubjectTypes();
  const deleteTeacherMutation = useTeacherDelete();
  const updateTeacherMutation = useTeacherUpdate();
  const { exportToCSV, isExporting } = useTeacherExport();

  const { data: teachers, isLoading } = useTeachers({
    page,
    limit: pageSize,
    name: debouncedName || undefined,
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

  // Extract unique values for filters
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
            placeholder="名前を入力"
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
            placeholder="ユーザー名を入力"
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
            placeholder="メールアドレスを入力"
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
          // For now, use legacy phoneNumber field for editing
          return (
            <GenericInlineEditableCell
              value={phoneNumber}
              onSubmit={(value) => handleCellUpdate(row.original.teacherId, "phoneNumber", value)}
              placeholder="電話番号を入力"
            />
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
            editable={true}
          />
        ),
      },
      {
        id: "lineConnection",
        accessorKey: "lineId",
        header: "メッセージ連携",
        meta: {
          label: "メッセージ連携",
        },
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.lineId}
            onSubmit={(value) => handleCellUpdate(row.original.teacherId, "lineId", value)}
            placeholder="LINE IDを入力"
          />
        ),
      },
      {
        id: "branches",
        accessorKey: "branches",
        header: "校舎",
        meta: {
          label: "校舎",
        },
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
        meta: {
          label: "担当科目",
        },
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
          const isOptimistic = row.original._optimistic;

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

  // Filter configuration for toolbar
  const filters = React.useMemo(() => [
    {
      column: "status",
      title: "ステータス",
      options: Object.keys(userStatusLabels),
      selectedValues: columnFilters.find(f => f.id === "status")?.value as string[] || [],
    },
    {
      column: "branches",
      title: "校舎",
      options: uniqueBranches.map(b => b.value),
      selectedValues: columnFilters.find(f => f.id === "branches")?.value as string[] || [],
    },
    {
      column: "subjectPreferences",
      title: "担当科目",
      options: subjects.map((subject) => subject.name),
      selectedValues: columnFilters.find(f => f.id === "subjectPreferences")?.value as string[] || [],
    },
    {
      column: "lineConnection",
      title: "メッセージ連携",
      options: ["connected_enabled", "connected_disabled", "not_connected"],
      selectedValues: columnFilters.find(f => f.id === "lineConnection")?.value as string[] || [],
    },
  ], [uniqueBranches, subjects, columnFilters]);

  const table = useReactTable({
    data: teachers?.data || [],
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: {
        pageIndex: page - 1,
        pageSize,
      },
    },
    pageCount: Math.ceil((teachers?.pagination.total || 0) / pageSize),
    getRowId: (row) => row.teacherId,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' 
        ? updater({ pageIndex: page - 1, pageSize })
        : updater;
      setPage(newPagination.pageIndex + 1);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

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
      name: searchValue || undefined,
      columns: visibleColumns,
    });
  };

  const handleImportComplete = () => {
    queryClient.invalidateQueries({ queryKey: ["teachers"] });
    setPage(1);
  };

  const handleFilterChange = (column: string, values: string[]) => {
    setColumnFilters(prev => {
      const filtered = prev.filter(f => f.id !== column);
      if (values.length > 0) {
        filtered.push({ id: column, value: values });
      }
      return filtered;
    });
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
          <h2 className="text-2xl font-bold tracking-tight">教師管理</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsImportDialogOpen(true)}
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

        <GenericTableToolbar
          table={table}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchableColumns={["name"]}
          filters={filters}
          onFilterChange={handleFilterChange}
          isLoading={isLoading}
        />

        {table.getFilteredSelectedRowModel().rows.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBatchDelete}
              disabled={deleteTeacherMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              選択した教師を削除 ({table.getFilteredSelectedRowModel().rows.length})
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

        <GenericTablePagination table={table} />
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