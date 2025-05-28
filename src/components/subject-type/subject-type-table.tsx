// src/components/subject-type/subject-type-table.tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import {
  useSubjectTypeDelete,
  getResolvedSubjectTypeId,
} from "@/hooks/useSubjectTypeMutation";
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
import { SubjectTypeFormDialog } from "./subject-type-form-dialog";
import { SubjectType, useSubjectTypes } from "@/hooks/useSubjectTypeQuery";

// Define custom column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

export function SubjectTypeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: subjectTypes, isLoading } = useSubjectTypes({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  // Ensure the data type returned by useSubjectTypes matches the expected type
  const typedSubjectTypes = subjectTypes?.data || [];

  const totalCount = subjectTypes?.pagination.total || 0;
  const deleteSubjectTypeMutation = useSubjectTypeDelete();

  const [subjectTypeToEdit, setSubjectTypeToEdit] =
    useState<SubjectType | null>(null);
  const [subjectTypeToDelete, setSubjectTypeToDelete] =
    useState<SubjectType | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<SubjectType, unknown>[] = [
    {
      accessorKey: "name",
      header: "科目タイプ名",
    },
    {
      accessorKey: "notes",
      header: "メモ",
      cell: ({ row }) => row.original.notes || "-",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = (
          row.original as SubjectType & { _optimistic?: boolean }
        )._optimistic;

        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSubjectTypeToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSubjectTypeToDelete(row.original)}
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

  // Filter out the branch column if user is not admin
  const visibleColumns = columns;

  const handleDeleteSubjectType = () => {
    if (subjectTypeToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedSubjectTypeId to resolve temp/server IDs
      const subjectTypeId = getResolvedSubjectTypeId(
        subjectTypeToDelete.subjectTypeId
      );
      setSubjectTypeToDelete(null);
      deleteSubjectTypeMutation.mutate(subjectTypeId);
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
        data={typedSubjectTypes}
        isLoading={isLoading && !typedSubjectTypes.length} // Only show loading state on initial load
        searchPlaceholder="科目タイプを検索..."
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

      {/* Edit SubjectType Dialog */}
      {subjectTypeToEdit && (
        <SubjectTypeFormDialog
          open={!!subjectTypeToEdit}
          onOpenChange={(open) => !open && setSubjectTypeToEdit(null)}
          subjectType={subjectTypeToEdit}
        />
      )}

      {/* Create SubjectType Dialog */}
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
            <AlertDialogAction
              onClick={handleDeleteSubjectType}
              disabled={deleteSubjectTypeMutation.isPending}
            >
              {deleteSubjectTypeMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
