// src/components/student/student-table.tsx
"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Eye, EyeOff, Trash2, MoreHorizontal } from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  useStudentDelete,
  getResolvedStudentId,
} from "@/hooks/useStudentMutation";
import { userStatusLabels } from "@/schemas/student.schema";

export function StudentTable() {
  // All hooks must be called before any conditional returns
  const [name] = useQueryState("name", parseAsString.withDefault(""));
  const [status] = useQueryState(
    "status",
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [studentType] = useQueryState(
    "studentType",
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [gradeYear] = useQueryState(
    "gradeYear",
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [branch] = useQueryState(
    "branch",
    parseAsArrayOf(parseAsString).withDefault([])
  );
  const [subject] = useQueryState(
    "subject",
    parseAsArrayOf(parseAsString).withDefault([])
  );
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

  const pageSize = 10;

  // Load data
  const { data: studentTypesResponse } = useStudentTypes();
  const { data: subjects = [] } = useAllSubjects();
  const { data: subjectTypes = [] } = useAllSubjectTypes();
  const deleteStudentMutation = useStudentDelete();

  // Memoize studentTypes to avoid dependency issues
  const studentTypes = React.useMemo(
    () => studentTypesResponse?.data || [],
    [studentTypesResponse?.data]
  );

  // Parse studentType names back to IDs for API call
  const studentTypeIds = React.useMemo(() => {
    if (studentType.length === 0) return undefined;
    return studentTypes
      .filter((type) => studentType.includes(type.name))
      .map((type) => type.studentTypeId);
  }, [studentType, studentTypes]);

  const { data: students, isLoading } = useStudents({
    page,
    limit: pageSize,
    name: name || undefined,
    studentTypeId: studentTypeIds?.[0], // API might only support single type
    status: status[0] || undefined, // API might only support single status
  });

  // Filter data client-side for multiple selections
  const filteredData = React.useMemo(() => {
    const data = students?.data || [];
    return data.filter((student) => {
      const matchesName =
        name === "" ||
        student.name?.toLowerCase().includes(name.toLowerCase()) ||
        student.kanaName?.toLowerCase().includes(name.toLowerCase());
      const matchesStatus =
        status.length === 0 || status.includes(student.status || "ACTIVE");
      const matchesStudentType =
        studentType.length === 0 ||
        (student.studentTypeName &&
          studentType.includes(student.studentTypeName));
      const matchesGradeYear =
        gradeYear.length === 0 ||
        (student.gradeYear !== null &&
          gradeYear.includes(student.gradeYear.toString()));
      const matchesBranch =
        branch.length === 0 ||
        (student.branches &&
          student.branches.some((b) => branch.includes(b.name)));
      const matchesSubject =
        subject.length === 0 ||
        (student.subjectPreferences &&
          student.subjectPreferences.some((pref) => {
            const subjectData = subjects.find(
              (s) => s.subjectId === pref.subjectId
            );
            return subjectData && subject.includes(subjectData.name);
          }));

      return (
        matchesName &&
        matchesStatus &&
        matchesStudentType &&
        matchesGradeYear &&
        matchesBranch &&
        matchesSubject
      );
    });
  }, [
    name,
    status,
    studentType,
    gradeYear,
    branch,
    subject,
    students?.data,
    subjects,
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
      {
        id: "lineId",
        accessorKey: "lineId",
        header: "LINE ID",
        cell: ({ row }) => row.original.lineId || "-",
        meta: {
          label: "LINE ID",
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
    },
    getRowId: (row) => row.studentId,
  });

  // Extract pagination state for dependency
  const paginationPageIndex = table.getState().pagination.pageIndex;

  React.useEffect(() => {
    setPage(paginationPageIndex + 1);
  }, [paginationPageIndex]);

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
          <Button onClick={() => setIsCreateDialogOpen(true)}>新規作成</Button>
        </div>

        <DataTable
          columns={columns}
          data={filteredData}
          toolbar={
            <DataTableToolbar table={table}>
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
            </DataTableToolbar>
          }
        />
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
    </>
  );
}
