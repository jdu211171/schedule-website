// src/components/student/student-table.tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Eye, EyeOff, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import {
  useStudentDelete,
  getResolvedStudentId,
} from "@/hooks/useStudentMutation";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define custom column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

export function StudentTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [selectedStudentTypeId, setSelectedStudentTypeId] =
    useState<string>("all");
  const [passwordVisibility, setPasswordVisibility] = useState<
    Record<string, boolean>
  >({});
  const pageSize = 10;

  // Load student types for filtering
  const { data: studentTypesResponse } = useStudentTypes();

  // Fetch subjects and subject types for displaying names
  const { data: subjects = [] } = useAllSubjects();
  const { data: subjectTypes = [] } = useAllSubjectTypes();

  const { data: students, isLoading } = useStudents({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
    studentTypeId:
      selectedStudentTypeId === "all" ? undefined : selectedStudentTypeId,
  });

  // Ensure the data type returned by useStudents matches the expected type
  const typedStudents = students?.data || [];

  const totalCount = students?.pagination.total || 0;
  const deleteStudentMutation = useStudentDelete();

  const [studentToEdit, setStudentToEdit] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<Student, unknown>[] = [
    {
      accessorKey: "name",
      header: "名前",
      cell: ({ row }) => row.original.name || "-",
    },
    {
      accessorKey: "kanaName",
      header: "カナ",
      cell: ({ row }) => row.original.kanaName || "-",
    },
    {
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
      accessorKey: "gradeYear",
      header: "学年",
      cell: ({ row }) =>
        row.original.gradeYear !== null ? row.original.gradeYear : "-",
    },
    {
      accessorKey: "username",
      header: "ユーザー名",
      cell: ({ row }) => row.original.username || "-",
    },
    {
      accessorKey: "email",
      header: "メールアドレス",
      cell: ({ row }) => row.original.email || "-",
    },
    {
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
              {isVisible ? password : "•".repeat(Math.min(password.length, 8))}
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
    {
      accessorKey: "lineId",
      header: "LINE ID",
      cell: ({ row }) => row.original.lineId || "-",
    },
    {
      accessorKey: "branches",
      header: "支店",
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
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = (
          row.original as Student & { _optimistic?: boolean }
        )._optimistic;

        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStudentToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStudentToDelete(row.original)}
            >
              <Trash2
                className={`h-4 w-4 text-destructive ${
                  isOptimistic ? "opacity-70" : ""
                }`}
              />
            </Button>
          </div>
        );
      },
      meta: {
        align: "right",
        headerClassName: "pr-8", // Add padding-right to ONLY the header
      } as ColumnMetaType,
    },
  ];

  const handleDeleteStudent = () => {
    if (studentToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedStudentId to resolve temp/server IDs
      const studentId = getResolvedStudentId(studentToDelete.studentId);
      setStudentToDelete(null);
      deleteStudentMutation.mutate(studentId);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Custom filter component for student types
  const CustomFilter = () => {
    return (
      <div className="flex items-center space-x-2">
        <Select
          value={selectedStudentTypeId}
          onValueChange={setSelectedStudentTypeId}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="生徒タイプで絞り込み" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべて</SelectItem>
            {studentTypesResponse?.data.map((type) => (
              <SelectItem key={type.studentTypeId} value={type.studentTypeId}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <>
      <div className="mb-4">
        <CustomFilter />
      </div>
      <DataTable
        columns={columns}
        data={typedStudents}
        isLoading={isLoading && !typedStudents.length} // Only show loading state on initial load
        searchPlaceholder="生徒を検索..."
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新規作成"
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
      />

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
