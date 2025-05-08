"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { GradeWithStudentType, useGrades } from "@/hooks/useGradeQuery";
import { useGradeDelete, getResolvedGradeId } from "@/hooks/useGradeMutation";
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
import { Grade } from "@prisma/client";
import { GradeFormDialog } from "@/components/grade/grade-form-dialog";

export function GradeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const {
    data: gradesData,
    isLoading,
  } = useGrades({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });
  const deleteGradeMutation = useGradeDelete();

  const [gradeToEdit, setGradeToEdit] = useState<Grade | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const grades = gradesData?.data || [];
  const totalCount = gradesData?.pagination.total || 0;

  const columns: ColumnDef<GradeWithStudentType>[] = [
    {
      accessorKey: "name",
      header: "名前",
    },
    {
      accessorKey: "studentTypeId",
      header: "学生タイプ",
      cell: ({ row }) => {
        return row.original.studentType.name;
      },
    },
    {
      accessorKey: "gradeYear",
      header: "学年",
      cell: ({ row }) =>
        row.original.gradeYear ? `${row.original.gradeYear}年生` : "-",
    },
    {
      accessorKey: "notes",
      header: "メモ",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = (row.original as Grade & { _optimistic?: boolean })._optimistic;

        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setGradeToEdit(row.original)}
            >
              <Pencil className={`h-4 w-4 ${isOptimistic ? 'opacity-70' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setGradeToDelete(row.original)}
            >
              <Trash2 className={`h-4 w-4 text-destructive ${isOptimistic ? 'opacity-70' : ''}`} />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDeleteGrade = () => {
    if (gradeToDelete) {
      // Close the dialog immediately for better UX
      const gradeId = getResolvedGradeId(gradeToDelete.gradeId);
      setGradeToDelete(null);
      deleteGradeMutation.mutate(gradeId);
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
        data={grades}
        isLoading={isLoading && !grades.length}
        searchPlaceholder="学年を検索..."
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新しい学年"
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
      />

      {/* 編集ダイアログ */}
      {gradeToEdit && (
        <GradeFormDialog
          open={!!gradeToEdit}
          onOpenChange={(open) => !open && setGradeToEdit(null)}
          grade={gradeToEdit}
        />
      )}

      {/* Create Grade Dialog */}
      <GradeFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!gradeToDelete}
        onOpenChange={(open) => !open && setGradeToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。学年「{gradeToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGrade}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
