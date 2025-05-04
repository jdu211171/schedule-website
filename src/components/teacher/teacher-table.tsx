"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useTeacherDelete } from "@/hooks/useTeacherMutation";
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
import { TeacherFormDialog } from "@/components/teacher/teacher-form-dialog";
import { useEvaluations } from "@/hooks/useEvaluationQuery";
import { useTeachers, TeacherWithPreference } from "@/hooks/useTeacherQuery";

export function TeacherTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const {
    data: teachers,
    isLoading,
    isFetching,
  } = useTeachers({ page, limit });
  const { data: evaluationsRaw } = useEvaluations();

  const evaluations = evaluationsRaw?.data ?? [];
  const evaluationMap = new Map<string, string>();
  evaluations.forEach((evaluation) => {
    if (evaluation.evaluationId) {
      evaluationMap.set(evaluation.evaluationId, evaluation.name);
    }
  });

  const deleteTeacherMutation = useTeacherDelete();
  const [teacherToEdit, setTeacherToEdit] = useState<TeacherWithPreference | null>(null);
  const [teacherToDelete, setTeacherToDelete] = useState<TeacherWithPreference | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<TeacherWithPreference>[] = [
    {
      accessorKey: "name",
      header: "名前",
    },
    {
      accessorKey: "evaluationId",
      header: "評価",
      cell: ({ row }) => {
        const evaluationId = row.original.evaluationId;
        return evaluationId ? evaluationMap.get(evaluationId) || "-" : "-";
      },
    },
    {
      accessorKey: "birthDate",
      header: "生年月日",
      cell: ({ row }) =>
        row.original.birthDate
          ? new Date(row.original.birthDate).toLocaleDateString()
          : "-",
    },
    {
      accessorKey: "mobileNumber",
      header: "携帯電話",
      cell: ({ row }) => row.original.mobileNumber || "-",
    },
    {
      accessorKey: "email",
      header: "メール",
      cell: ({ row }) => row.original.email || "-",
    },
    {
      accessorKey: "university",
      header: "大学",
      cell: ({ row }) => row.original.university || "-",
    },
    {
      accessorKey: "faculty",
      header: "学部",
      cell: ({ row }) => row.original.faculty || "-",
    },
    {
      accessorKey: "enrollmentStatus",
      header: "在籍状況",
      cell: ({ row }) => row.original.enrollmentStatus || "-",
    },
    {
      accessorKey: "notes",
      header: "メモ",
      cell: ({ row }) => row.original.notes || "-",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
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
      ),
    },
  ];

  const handleDeleteTeacher = async () => {
    if (teacherToDelete) {
      try {
        await deleteTeacherMutation.mutateAsync(teacherToDelete.teacherId);
        setTeacherToDelete(null);
      } catch (error) {
        console.error("講師の削除に失敗しました:", error);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  // Map undefined to null for all optional string fields in teachers data
  // This fixes the type incompatibility with the DataTable component
  const normalizedTeachers = (teachers?.data || []).map((t) => ({
    ...t,
    otherUniversities: t.otherUniversities ?? null,
    englishProficiency: t.englishProficiency ?? null,
    mathCertification: t.mathCertification ?? null,
    kanjiCertification: t.kanjiCertification ?? null,
    otherCertifications: t.otherCertifications ?? null,
    notes: t.notes ?? null,
  }));

  return (
    <>
      <DataTable
        columns={columns}
        data={normalizedTeachers}
        isLoading={isLoading || isFetching}
        searchPlaceholder="講師を検索..."
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新しい講師"
        pageIndex={page - 1}
        pageCount={teachers?.pagination.pages || 0}
        onPageChange={handlePageChange}
        pageSize={teachers?.pagination.pageSize || 0}
        totalItems={teachers?.pagination.total || 0}
      />

      {teacherToEdit && (
        <TeacherFormDialog
          open={!!teacherToEdit}
          onOpenChange={(open) => !open && setTeacherToEdit(null)}
          teacher={teacherToEdit}
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
            <AlertDialogCancel onClick={() => setTeacherToDelete(null)}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeacher}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
