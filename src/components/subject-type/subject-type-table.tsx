"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useSubjectTypes } from "@/hooks/useSubjectTypeQuery";
import { useSubjectTypeDelete } from "@/hooks/useSubjectTypeMutation";
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
import { SubjectType } from "@prisma/client";
import { SubjectTypeFormDialog } from "@/components/subject-type/subject-type-form-dialog";

export function SubjectTypeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const {
    data: subjectTypes,
    isLoading,
    isFetching,
  } = useSubjectTypes({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const typedSubjectTypes = subjectTypes?.data;
  const totalCount = subjectTypes?.pagination.total || 0;
  const deleteSubjectTypeMutation = useSubjectTypeDelete();

  const [subjectTypeToEdit, setSubjectTypeToEdit] =
    useState<SubjectType | null>(null);
  const [subjectTypeToDelete, setSubjectTypeToDelete] =
    useState<SubjectType | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<SubjectType>[] = [
    {
      accessorKey: "name",
      header: "名前",
    },
    {
      accessorKey: "notes",
      header: "メモ",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSubjectTypeToEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSubjectTypeToDelete(row.original)}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  const handleDeleteSubjectType = async () => {
    if (subjectTypeToDelete) {
      try {
        await deleteSubjectTypeMutation.mutateAsync(
          subjectTypeToDelete.subjectTypeId
        );
        setSubjectTypeToDelete(null);
      } catch (error) {
        console.error("科目タイプの削除に失敗しました:", error);
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
        data={typedSubjectTypes || []}
        isLoading={isLoading || isFetching}
        searchPlaceholder="科目タイプを検索..."
        onSearch={setSearchTerm}
        searchValue={searchTerm}
        onCreateNew={() => setIsCreateDialogOpen(true)}
        createNewLabel="新しい科目タイプ"
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
      />

      {/* Edit Subject Type Dialog */}
      {subjectTypeToEdit && (
        <SubjectTypeFormDialog
          open={!!subjectTypeToEdit}
          onOpenChange={(open) => !open && setSubjectTypeToEdit(null)}
          subjectType={subjectTypeToEdit}
        />
      )}

      {/* Create Subject Type Dialog */}
      <SubjectTypeFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!subjectTypeToDelete}
        onOpenChange={(open) => !open && setSubjectTypeToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。科目タイプ「{subjectTypeToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSubjectType}>
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
