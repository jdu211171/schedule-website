"use client";

import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useTeacherSubjects } from "@/hooks/useTeacherSubjectQuery";
import { useTeacherSubjectDelete } from "@/hooks/useTeacherSubjectMutation";
import { TeacherSubjectFormDialog } from "@/components/teacher-subject/teacher-subject-form-dialog";
import { TeacherSubject } from "@prisma/client";
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

export type TeacherSubjectWithRelations = TeacherSubject & {
  teacher: {
    teacherId: string;
    name: string;
  };
  subject: {
    subjectId: string;
    name: string;
  };
  subjectType: {
    subjectTypeId: string;
    name: string;
  };
  _optimistic?: boolean;
  _tempId?: string;
};

type GroupedTeacherSubject = {
  teacherId: string;
  teacherName: string;
  subjects: {
    subjectId: string;
    subjectTypeId: string;
    subjectName: string;
    subjectTypeName: string;
    notes?: string;
    original: TeacherSubjectWithRelations;
  }[];
};

export function TeacherSubjectTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const {
    data: teacherSubjects,
    isLoading,
    isFetching,
  } = useTeacherSubjects({
    page,
    pageSize,
  });

  const [teacherSubjectToDelete, setTeacherSubjectToDelete] =
    useState<TeacherSubjectWithRelations | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const deleteTeacherSubjectMutation = useTeacherSubjectDelete();

  // Group teacher subjects by teacher
  const groupedData = useMemo(() => {
    if (!teacherSubjects?.data) return [];

    const groupedByTeacher: Record<string, GroupedTeacherSubject> = {};

    teacherSubjects.data.forEach((item) => {
      if (!groupedByTeacher[item.teacherId]) {
        groupedByTeacher[item.teacherId] = {
          teacherId: item.teacherId,
          teacherName: item.teacher.name,
          subjects: [],
        };
      }

      groupedByTeacher[item.teacherId].subjects.push({
        subjectId: item.subjectId,
        subjectTypeId: item.subjectTypeId,
        subjectName: item.subject.name,
        subjectTypeName: item.subjectType.name,
        notes: item.notes || undefined,
        original: item,
      });
    });

    return Object.values(groupedByTeacher);
  }, [teacherSubjects?.data]);

  // Filter teachers by name if search term is provided
  const filteredData = useMemo(() => {
    if (!searchTerm) return groupedData;

    return groupedData.filter(
      (group) =>
        group.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.subjects.some((subject) =>
          subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
  }, [groupedData, searchTerm]);

  const handleDeleteTeacherSubject = async () => {
    if (teacherSubjectToDelete) {
      try {
        const deleteParams = {
          teacherId: teacherSubjectToDelete.teacherId,
          subjectId: teacherSubjectToDelete.subjectId,
          subjectTypeId: teacherSubjectToDelete.subjectTypeId,
          tempId: (teacherSubjectToDelete as any)._tempId, // Pass tempId if it exists
        };

        // Close the dialog immediately for better UX
        setTeacherSubjectToDelete(null);

        // Then trigger the mutation without waiting for result
        await deleteTeacherSubjectMutation.mutateAsync(deleteParams);
      } catch (error) {
        console.error("講師科目の削除に失敗しました:", error);
      }
    }
  };

  const columns: ColumnDef<GroupedTeacherSubject>[] = [
    {
      accessorKey: "teacherName",
      header: "講師",
      size: 150, // Limit the width of the teacher name column
    },
    {
      id: "subjects",
      header: "対応科目",
      cell: ({ row }) => (
        <div className="flex flex-row flex-wrap gap-2">
          {row.original.subjects.map((subject) => {
            // Check for optimistic UI flag
            const isOptimistic = (subject.original as any)._optimistic;

            return (
              <div
                key={`${
                  subject.original._tempId ||
                  `${subject.subjectId}-${subject.subjectTypeId}-${subject.original.teacherId}`
                }`}
                className={`flex items-center border rounded-md p-1 bg-muted/30 ${
                  isOptimistic ? "opacity-70" : ""
                }`}
              >
                <span className="font-medium text-sm">
                  {subject.subjectName}
                </span>
                <span className="text-xs text-muted-foreground ml-1">
                  ({subject.subjectTypeName})
                </span>
                {subject.notes && (
                  <span className="text-xs italic ml-1">- {subject.notes}</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 ml-1"
                  onClick={() => setTeacherSubjectToDelete(subject.original)}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      ),
    },
  ];

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const totalCount = teacherSubjects?.pagination.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading || isFetching}
        searchPlaceholder="講師名または科目名で検索..."
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新しい講師科目の割り当て"
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
      />

      {/* Create TeacherSubject Dialog */}
      <TeacherSubjectFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!teacherSubjectToDelete}
        onOpenChange={(open) => !open && setTeacherSubjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。「{teacherSubjectToDelete?.teacher.name}
              」から「{teacherSubjectToDelete?.subject.name}(
              {teacherSubjectToDelete?.subjectType.name})」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTeacherSubject}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
