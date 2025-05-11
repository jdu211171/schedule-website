"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useSubjects } from "@/hooks/useSubjectQuery";
import {
  useSubjectDelete,
  getResolvedSubjectId,
} from "@/hooks/useSubjectMutation";
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
import { SubjectFormDialog } from "@/components/subject/subject-form-dialog";
import { SubjectWithRelations } from "@/schemas/subject.schema";

export function SubjectTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const {
    data: subjects,
    isLoading,
    isFetching,
  } = useSubjects({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const typedSubjects = subjects?.data;
  const totalCount = subjects?.pagination.total || 0;
  const deleteSubjectMutation = useSubjectDelete();

  const [subjectToEdit, setSubjectToEdit] =
    useState<SubjectWithRelations | null>(null);
  const [subjectToDelete, setSubjectToDelete] =
    useState<SubjectWithRelations | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<SubjectWithRelations>[] = [
    {
      accessorKey: "name",
      header: "名前",
    },
    {
      id: "subjectTypes",
      header: "科目タイプ",
      cell: ({ row }) => {
        // Handle optimistic UI for subject types
        const isOptimistic = (row.original as any)._optimistic;
        if (isOptimistic) {
          return (
            <div className="opacity-70">
              {row.original.subjectToSubjectTypes
                .map((rel) => rel.subjectType?.name ?? rel.subjectTypeId)
                .join(", ")}
            </div>
          );
        }

        return (
          <div>
            {row.original.subjectToSubjectTypes
              .map((rel) => rel.subjectType?.name ?? rel.subjectTypeId)
              .join(", ")}
          </div>
        );
      },
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
        const isOptimistic = (row.original as any)._optimistic;

        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setSubjectToEdit(normalizeSubjectNotes(row.original))
              }
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                setSubjectToDelete(normalizeSubjectNotes(row.original))
              }
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
    },
  ];

  const handleDeleteSubject = async () => {
    if (subjectToDelete) {
      try {
        // Close the dialog immediately for better UX
        const subjectId = getResolvedSubjectId(subjectToDelete.subjectId);
        setSubjectToDelete(null);
        await deleteSubjectMutation.mutateAsync(subjectId);
      } catch (error) {
        console.error("科目の削除に失敗しました:", error);
      }
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Helper to normalize notes to string | undefined
  function normalizeSubjectNotes(subject: SubjectWithRelations) {
    return {
      ...subject,
      notes: subject.notes ?? undefined,
    };
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={typedSubjects || []}
        isLoading={isLoading || isFetching}
        searchPlaceholder="科目を検索..."
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新しい科目"
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
      />

      {/* Edit Subject Dialog */}
      {subjectToEdit && (
        <SubjectFormDialog
          open={!!subjectToEdit}
          onOpenChange={(open) => !open && setSubjectToEdit(null)}
          subject={subjectToEdit}
        />
      )}

      {/* Create Subject Dialog */}
      <SubjectFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!subjectToDelete}
        onOpenChange={(open) => !open && setSubjectToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。科目「{subjectToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubject}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
