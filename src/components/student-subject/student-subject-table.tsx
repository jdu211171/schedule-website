"use client";

import { useState, useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useStudentPreferenceSubjects } from "@/hooks/useStudentPreferenceSubjectQuery";
import { useStudentPreferenceSubjectDelete } from "@/hooks/useStudentPreferenceSubjectMutation";
import { StudentSubjectFormDialog } from "@/components/student-subject/student-subject-form-dialog";
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
import { StudentPreferenceSubjectWithRelations } from "@/hooks/useStudentPreferenceSubjectQuery";

// Extended type to handle optimistic UI
type ExtendedStudentPreferenceSubject =
  StudentPreferenceSubjectWithRelations & {
    _optimistic?: boolean;
    _tempId?: string;
  };

type GroupedStudentSubject = {
  studentId: string;
  studentName: string;
  subjects: {
    id: string;
    subjectId: string;
    subjectTypeId: string;
    subjectName: string;
    subjectTypeName: string;
    notes?: string;
    original: ExtendedStudentPreferenceSubject;
  }[];
};

export function StudentSubjectTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const {
    data: studentSubjects,
    isLoading,
    isFetching,
  } = useStudentPreferenceSubjects({
    page,
    pageSize,
  });

  const [studentSubjectToDelete, setStudentSubjectToDelete] =
    useState<ExtendedStudentPreferenceSubject | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const deleteStudentSubjectMutation = useStudentPreferenceSubjectDelete();

  // Group student subjects by student
  const groupedData = useMemo(() => {
    if (!studentSubjects?.data) return [];

    const groupedByStudent: Record<string, GroupedStudentSubject> = {};

    studentSubjects.data.forEach((item) => {
      const studentId = item.studentPreference.student.studentId;
      const studentName = item.studentPreference.student.name;

      if (!groupedByStudent[studentId]) {
        groupedByStudent[studentId] = {
          studentId,
          studentName,
          subjects: [],
        };
      }

      groupedByStudent[studentId].subjects.push({
        id: (item as ExtendedStudentPreferenceSubject)._tempId || item.id,
        subjectId: item.subjectId,
        subjectTypeId: item.subjectTypeId,
        subjectName: item.subject.name,
        subjectTypeName: item.subjectType.name,
        notes: item.notes,
        original: item as ExtendedStudentPreferenceSubject,
      });
    });

    return Object.values(groupedByStudent);
  }, [studentSubjects?.data]);

  // Filter students by name if search term is provided
  const filteredData = useMemo(() => {
    if (!searchTerm) return groupedData;

    return groupedData.filter(
      (group) =>
        group.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        group.subjects.some((subject) =>
          subject.subjectName.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );
  }, [groupedData, searchTerm]);

  const handleDeleteStudentSubject = async () => {
    if (studentSubjectToDelete) {
      try {
        // Close the dialog immediately for better UX
        const deleteParams = {
          id: studentSubjectToDelete._tempId || studentSubjectToDelete.id,
        };

        setStudentSubjectToDelete(null);

        // Then trigger the mutation without waiting for result
        await deleteStudentSubjectMutation.mutateAsync(deleteParams);
      } catch (error) {
        console.error("生徒科目の削除に失敗しました:", error);
      }
    }
  };

  const columns: ColumnDef<GroupedStudentSubject>[] = [
    {
      accessorKey: "studentName",
      header: "生徒",
      size: 150, // Limit the width of the student name column
    },
    {
      id: "subjects",
      header: "希望科目",
      cell: ({ row }) => (
        <div className="flex flex-row flex-wrap gap-2">
          {row.original.subjects.map((subject) => {
            // Check for optimistic UI flag
            const isOptimistic = subject.original._optimistic;

            return (
              <div
                key={subject.id}
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
                  onClick={() => setStudentSubjectToDelete(subject.original)}
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

  const totalCount = studentSubjects?.pagination.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredData}
        isLoading={isLoading || isFetching}
        searchPlaceholder="生徒名または科目名で検索..."
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新しい生徒科目の割り当て"
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
      />

      {/* Create StudentSubject Dialog */}
      <StudentSubjectFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!studentSubjectToDelete}
        onOpenChange={(open) => !open && setStudentSubjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。「
              {studentSubjectToDelete?.studentPreference.student.name}
              」から「{studentSubjectToDelete?.subject.name}(
              {studentSubjectToDelete?.subjectType.name})」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteStudentSubject}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
