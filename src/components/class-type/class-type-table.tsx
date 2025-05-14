"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useClassTypes } from "@/hooks/useClassTypeQuery";
import {
  useClassTypeDelete,
  getResolvedClassTypeId,
} from "@/hooks/useClassTypeMutation";
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
import { ClassType } from "@prisma/client";
import { ClassTypeFormDialog } from "@/components/class-type/class-type-form-dialog";

export function ClassTypeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: classTypes, isLoading } = useClassTypes({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  // Ensure the data type returned by useClassTypes matches the expected type
  const typedClassTypes = classTypes?.data;

  const totalCount = classTypes?.pagination.total || 0;
  const deleteClassTypeMutation = useClassTypeDelete();

  const [classTypeToEdit, setClassTypeToEdit] = useState<ClassType | null>(
    null
  );
  const [classTypeToDelete, setClassTypeToDelete] = useState<ClassType | null>(
    null
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<ClassType>[] = [
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
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = (
          row.original as ClassType & { _optimistic?: boolean }
        )._optimistic;

        return (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setClassTypeToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setClassTypeToDelete(row.original)}
              // disabled={isOptimistic}
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

  const handleDeleteClassType = () => {
    if (classTypeToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedClassTypeId to resolve temp/server IDs
      const classTypeId = getResolvedClassTypeId(classTypeToDelete.classTypeId);
      setClassTypeToDelete(null);
      deleteClassTypeMutation.mutate(classTypeId);
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
        data={typedClassTypes || []}
        isLoading={isLoading && !typedClassTypes} // Only show loading state on initial load
        searchPlaceholder="授業タイプを検索..."
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

      {/* Edit ClassType Dialog */}
      {classTypeToEdit && (
        <ClassTypeFormDialog
          open={!!classTypeToEdit}
          onOpenChange={(open) => !open && setClassTypeToEdit(null)}
          classType={classTypeToEdit}
        />
      )}

      {/* Create ClassType Dialog */}
      <ClassTypeFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!classTypeToDelete}
        onOpenChange={(open) => !open && setClassTypeToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。授業タイプ「{classTypeToDelete?.name}
              」を完全に削除します。関連するクラスセッション、テンプレート、または学生の希望がある場合、削除はできません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClassType}
              disabled={deleteClassTypeMutation.isPending}
            >
              {deleteClassTypeMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
