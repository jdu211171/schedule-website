// src/components/student-type-table.tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  useStudentTypeDelete,
  getResolvedStudentTypeId,
} from "@/hooks/useStudentTypeMutation";
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
import { StudentTypeFormDialog } from "./student-type-form-dialog";
import { StudentType, useStudentTypes } from "@/hooks/useStudentTypeQuery";
import { useSession } from "next-auth/react";

// Define custom column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

export function StudentTypeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: studentTypes, isLoading } = useStudentTypes({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // Ensure the data type returned by useStudentTypes matches the expected type
  const typedStudentTypes = studentTypes?.data || [];

  const totalCount = studentTypes?.pagination.total || 0;
  const deleteStudentTypeMutation = useStudentTypeDelete();

  const [studentTypeToEdit, setStudentTypeToEdit] =
    useState<StudentType | null>(null);
  const [studentTypeToDelete, setStudentTypeToDelete] =
    useState<StudentType | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<StudentType, unknown>[] = [
    {
      accessorKey: "name",
      header: "名前",
    },
    {
      accessorKey: "maxYears",
      header: "最大学年数",
      cell: ({ row }) => row.original.maxYears || "-",
    },
    {
      accessorKey: "description",
      header: "説明",
      cell: ({ row }) => row.original.description || "-",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = (
          row.original as StudentType & { _optimistic?: boolean }
        )._optimistic;

        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStudentTypeToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStudentTypeToDelete(row.original)}
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

  // Filter out columns if needed
  const visibleColumns = columns.filter((col) => {
    const meta = col.meta as ColumnMetaType | undefined;
    return !meta?.hidden;
  });

  const handleDeleteStudentType = () => {
    if (studentTypeToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedStudentTypeId to resolve temp/server IDs
      const studentTypeId = getResolvedStudentTypeId(
        studentTypeToDelete.studentTypeId
      );
      setStudentTypeToDelete(null);
      deleteStudentTypeMutation.mutate(studentTypeId);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <DataTable
        columns={visibleColumns}
        data={typedStudentTypes}
        isLoading={isLoading && !typedStudentTypes.length} // Only show loading state on initial load
        searchPlaceholder="生徒タイプを検索..."
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

      {/* Edit StudentType Dialog */}
      {studentTypeToEdit && (
        <StudentTypeFormDialog
          open={!!studentTypeToEdit}
          onOpenChange={(open: any) => !open && setStudentTypeToEdit(null)}
          studentType={studentTypeToEdit}
        />
      )}

      {/* Create StudentType Dialog */}
      <StudentTypeFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!studentTypeToDelete}
        onOpenChange={(open) => !open && setStudentTypeToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。生徒タイプ「{studentTypeToDelete?.name}
              」を完全に削除します。
              {studentTypeToDelete && studentTypeToDelete.studentCount > 0 && (
                <span className="text-red-500 block mt-2 font-bold">
                  このタイプを使用している生徒がいるため削除できません。
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStudentType}
              disabled={
                deleteStudentTypeMutation.isPending ||
                (studentTypeToDelete?.studentCount || 0) > 0
              }
            >
              {deleteStudentTypeMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
