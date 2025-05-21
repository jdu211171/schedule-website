// src/components/teacher/teacher-table.tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import {
  useTeacherDelete,
  getResolvedTeacherId,
} from "@/hooks/useTeacherMutation";
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

// Define custom column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

export function TeacherTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: teachers, isLoading } = useTeachers({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  // Ensure the data type returned by useTeachers matches the expected type
  const typedTeachers = teachers?.data || [];

  const totalCount = teachers?.pagination.total || 0;
  const deleteTeacherMutation = useTeacherDelete();

  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<Teacher, unknown>[] = [
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
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = (
          row.original as Teacher & { _optimistic?: boolean }
        )._optimistic;

        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTeacherToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTeacherToDelete(row.original)}
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

  const handleDeleteTeacher = () => {
    if (teacherToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedTeacherId to resolve temp/server IDs
      const teacherId = getResolvedTeacherId(teacherToDelete.teacherId);
      setTeacherToDelete(null);
      deleteTeacherMutation.mutate(teacherId);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <DataTable
        columns={columns}
        data={typedTeachers}
        isLoading={isLoading && !typedTeachers.length} // Only show loading state on initial load
        searchPlaceholder="教師を検索..."
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
    </>
  );
}
