// src/components/student/student-table-v0.tsx
"use client";

import * as React from "react";
import type { ColumnDef, ColumnFiltersState, SortingState, VisibilityState } from "@tanstack/react-table";
import { Pencil, Trash2, MoreHorizontal, Download, Upload, Plus } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useStudentExport } from "@/hooks/useStudentExport";
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
import { StudentFormDialog } from "./student-form-dialog";
import { Student, useStudents } from "@/hooks/useStudentQuery";
import { useStudentTypes } from "@/hooks/useStudentTypeQuery";
import { useAllSubjects } from "@/hooks/useSubjectQuery";
import { useAllSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import { CSVImportDialog } from "@/components/ui/csv-import-dialog";
import { useQueryClient } from "@tanstack/react-query";
import {
  useStudentDelete,
  useStudentUpdate,
  getResolvedStudentId,
} from "@/hooks/useStudentMutation";
import { userStatusLabels, schoolTypeLabels, examCategoryLabels, examCategoryTypeLabels } from "@/schemas/student.schema";
import { TypeBadge } from "@/components/data-table-v0/type-badge-v0";

export function StudentTableV0() {
  const [page, setPage] = React.useState(1);
  const [studentToEdit, setStudentToEdit] = React.useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = React.useState<Student | null>(null);
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
  const { data: studentTypesResponse } = useStudentTypes();
  const studentTypes = studentTypesResponse?.data || [];
  const deleteStudentMutation = useStudentDelete();
  const updateStudentMutation = useStudentUpdate();
  const { exportToCSV, isExporting } = useStudentExport();

  const { data: students, isLoading } = useStudents({
    page,
    limit: pageSize,
    name: debouncedName || undefined,
  });

  // Handle inline cell updates
  const handleCellUpdate = React.useCallback(
    (studentId: string, field: string, value: string) => {
      updateStudentMutation.mutate({
        studentId,
        [field]: value,
      });
    },
    [updateStudentMutation]
  );

  // Extract unique values for filters
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
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.name}
            onSubmit={(value) => handleCellUpdate(row.original.studentId, "name", value)}
            placeholder="名前を入力"
          />
        ),
      },
      {
        id: "kanaName",
        accessorKey: "kanaName",
        header: "カナ",
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.kanaName}
            onSubmit={(value) => handleCellUpdate(row.original.studentId, "kanaName", value)}
            placeholder="カナを入力"
          />
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "ステータス",
        cell: ({ row }) => {
          const status = row.original.status || "ACTIVE";
          return (
            <GenericSelectEditableCell
              value={status}
              options={Object.entries(userStatusLabels).map(([value, label]) => ({ value, label }))}
              onSubmit={(value) => handleCellUpdate(row.original.studentId, "status", value)}
            />
          );
        },
      },
      {
        id: "studentType",
        accessorKey: "studentTypeName",
        header: "生徒タイプ",
        cell: ({ row }) => {
          const typeName = row.original.studentTypeName;
          if (!typeName) return "-";
          return <TypeBadge type={typeName} />;
        },
      },
      {
        id: "gradeYear",
        accessorKey: "gradeYear",
        header: "学年",
        cell: ({ row }) => {
          const gradeYear = row.original.gradeYear;
          if (!gradeYear) return "-";
          return `${gradeYear}年生`;
        },
      },
      {
        id: "username",
        accessorKey: "username",
        header: "ユーザー名",
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.username}
            onSubmit={(value) => handleCellUpdate(row.original.studentId, "username", value)}
            placeholder="ユーザー名を入力"
          />
        ),
      },
      {
        id: "email",
        accessorKey: "email",
        header: "メールアドレス",
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.email}
            onSubmit={(value) => handleCellUpdate(row.original.studentId, "email", value)}
            placeholder="メールアドレスを入力"
          />
        ),
      },
      {
        id: "parentEmail",
        accessorKey: "parentEmail",
        header: "保護者メール",
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.parentEmail}
            onSubmit={(value) => handleCellUpdate(row.original.studentId, "parentEmail", value)}
            placeholder="保護者メールを入力"
          />
        ),
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
        id: "schoolInfo",
        header: "学校情報",
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.schoolName}
            onSubmit={(value) => handleCellUpdate(row.original.studentId, "schoolName", value)}
            placeholder="学校名を入力"
          />
        ),
      },
      {
        id: "examInfo",
        header: "受験情報",
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.examCategory}
            onSubmit={(value) => handleCellUpdate(row.original.studentId, "examCategory", value)}
            placeholder="受験情報を入力"
          />
        ),
      },
      {
        id: "choices",
        header: "志望校",
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.firstChoice}
            onSubmit={(value) => handleCellUpdate(row.original.studentId, "firstChoice", value)}
            placeholder="第一志望校を入力"
          />
        ),
      },
      {
        id: "contactPhones",
        accessorKey: "contactPhones",
        header: "連絡先電話",
        cell: ({ row }) => {
          const homePhone = row.original.homePhone;
          // Use legacy homePhone field for editing
          return (
            <GenericInlineEditableCell
              value={homePhone}
              onSubmit={(value) => handleCellUpdate(row.original.studentId, "homePhone", value)}
              placeholder="電話番号を入力"
            />
          );
        },
      },
      {
        id: "password",
        accessorKey: "password",
        header: "パスワード",
        cell: ({ row }) => (
          <GenericPasswordEditableCell
            value={row.original.password}
            onSubmit={(value) => handleCellUpdate(row.original.studentId, "password", value)}
            editable={true}
          />
        ),
      },
      {
        id: "lineConnection",
        accessorKey: "lineId",
        header: "メッセージ連携",
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.lineId}
            onSubmit={(value) => handleCellUpdate(row.original.studentId, "lineId", value)}
            placeholder="LINE IDを入力"
          />
        ),
      },
      {
        id: "branches",
        accessorKey: "branches",
        header: "校舎",
        cell: ({ row }) => {
          const branches = row.original.branches || [];
          const firstBranch = branches[0];
          // For now, handle single branch selection
          return (
            <GenericSelectEditableCell
              value={firstBranch?.branchId}
              options={uniqueBranches.map(b => ({ value: b.value, label: b.label }))}
              onSubmit={(value) => handleCellUpdate(row.original.studentId, "branchIds", value)}
              placeholder="校舎を選択"
            />
          );
        },
      },
      {
        id: "subjectPreferences",
        accessorKey: "subjectPreferences",
        header: "受講科目",
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
        cell: ({ row }) => (
          <GenericInlineEditableCell
            value={row.original.notes}
            onSubmit={(value) => handleCellUpdate(row.original.studentId, "notes", value)}
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
      column: "studentType",
      title: "生徒タイプ",
      options: Array.isArray(studentTypes) ? studentTypes.map((type) => type.name) : [],
      selectedValues: columnFilters.find(f => f.id === "studentType")?.value as string[] || [],
    },
    {
      column: "gradeYear",
      title: "学年",
      options: [1, 2, 3, 4, 5, 6].map(year => year.toString()),
      selectedValues: columnFilters.find(f => f.id === "gradeYear")?.value as string[] || [],
    },
    {
      column: "branches",
      title: "校舎",
      options: uniqueBranches.map(b => b.value),
      selectedValues: columnFilters.find(f => f.id === "branches")?.value as string[] || [],
    },
    {
      column: "subjectPreferences",
      title: "受講科目",
      options: subjects.map((subject) => subject.name),
      selectedValues: columnFilters.find(f => f.id === "subjectPreferences")?.value as string[] || [],
    },
    {
      column: "lineConnection",
      title: "メッセージ連携",
      options: ["connected_enabled", "connected_disabled", "not_connected"],
      selectedValues: columnFilters.find(f => f.id === "lineConnection")?.value as string[] || [],
    },
    {
      column: "schoolType",
      title: "学校種別",
      options: Object.keys(schoolTypeLabels),
      selectedValues: columnFilters.find(f => f.id === "schoolType")?.value as string[] || [],
    },
    {
      column: "examCategory",
      title: "受験区分",
      options: Object.keys(examCategoryLabels),
      selectedValues: columnFilters.find(f => f.id === "examCategory")?.value as string[] || [],
    },
  ], [userStatusLabels, studentTypes, uniqueBranches, subjects, columnFilters]);

  const table = useReactTable({
    data: students?.data || [],
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
    pageCount: Math.ceil((students?.pagination.total || 0) / pageSize),
    getRowId: (row) => row.studentId,
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
    queryClient.invalidateQueries({ queryKey: ["students"] });
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

  if (isLoading && !students) {
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
              disabled={deleteStudentMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              選択した生徒を削除 ({table.getFilteredSelectedRowModel().rows.length})
            </Button>
          </div>
        )}

        <div className="rounded-md border">
          <GenericDraggableTable 
            table={table} 
            dataIds={students?.data.map(s => s.studentId) || []} 
            onDragEnd={() => {}} 
            columnsLength={columns.length} 
          />
        </div>

        <GenericTablePagination table={table} />
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