"use client"

import { useState } from "react"
import type { ColumnDef } from "@tanstack/react-table"
import { Pencil, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/data-table"
import { useTeachers } from "@/hooks/useTeacherQuery"
import { useTeacherDelete } from "@/hooks/useTeacherMutation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Teacher } from "@prisma/client"
import { TeacherFormDialog } from "@/components/teacher/teacher-form-dialog"

export function TeacherTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const {
    data: teachers,
    isLoading,
    isFetching,
  } = useTeachers({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const typedTeachers = teachers?.data;
  const totalCount = teachers?.pagination.total || 0;
  const deleteTeacherMutation = useTeacherDelete();

  const [teacherToEdit, setTeacherToEdit] = useState<Teacher | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<Teacher>[] = [
    {
      accessorKey: "name",
      header: "名前",
    },
    {
      accessorKey: "enrollmentStatus",  // Используем правильный ключ
      header: "ステータス",
      cell: ({ row }) => (
        <div>{row.original.enrollmentStatus === "ACTIVE" ? "使用可" : "使用不可"}</div>  // Логика отображения статуса
      ),
    },
    {
      accessorKey: "notes",
      header: "メモ",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTeacherToEdit(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTeacherToDelete(row.original)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];

  const handleDeleteTeacher = async () => {
    if (teacherToDelete) {
      try {
        await deleteTeacherMutation.mutateAsync(teacherToDelete.teacherId);
        setTeacherToDelete(null);
      } catch (error) {
        console.error("教師の削除に失敗しました:", error);
      }
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
        data={typedTeachers || []}
        isLoading={isLoading || isFetching}
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

      {teacherToEdit && (
        <TeacherFormDialog
          open={!!teacherToEdit}
          onOpenChange={(open) => !open && setTeacherToEdit(null)}
          teacher={{
            ...teacherToEdit,
            otherUniversities: teacherToEdit.otherUniversities ?? undefined,
            englishProficiency: teacherToEdit.englishProficiency ?? undefined,
            toeic: teacherToEdit.toeic ?? undefined,
            toefl: teacherToEdit.toefl ?? undefined,
            mathCertification: teacherToEdit.mathCertification ?? undefined,
            kanjiCertification: teacherToEdit.kanjiCertification ?? undefined,
            otherCertifications: teacherToEdit.otherCertifications ?? undefined,
            notes: teacherToEdit.notes ?? undefined
          }}
        />
      )}

      <TeacherFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <AlertDialog
        open={!!teacherToDelete}
        onOpenChange={(open) => !open && setTeacherToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>講師の削除</AlertDialogTitle>
            <AlertDialogDescription>
              本当にこの講師を削除してもよろしいですか？この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTeacherToDelete(null)}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeacher}>削除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
