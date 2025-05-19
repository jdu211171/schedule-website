// src/components/class-type-table.tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
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
import { ClassTypeFormDialog } from "./class-type-form-dialog";
import { ClassType, useClassTypes } from "@/hooks/useClassTypeQuery";
import { useSession } from "next-auth/react";

// Define custom column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

export function ClassTypeTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: classTypes, isLoading } = useClassTypes({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // Ensure the data type returned by useClassTypes matches the expected type
  const typedClassTypes = classTypes?.data || [];

  const totalCount = classTypes?.pagination.total || 0;
  const deleteClassTypeMutation = useClassTypeDelete();

  const [classTypeToEdit, setClassTypeToEdit] = useState<ClassType | null>(
    null
  );
  const [classTypeToDelete, setClassTypeToDelete] = useState<ClassType | null>(
    null
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<ClassType, unknown>[] = [
    {
      accessorKey: "name",
      header: "クラスタイプ名",
    },
    {
      accessorKey: "branchName",
      header: "支店",
      cell: ({ row }) => row.original.branchName || "-",
      // Only show for admins
      meta: {
        hidden: !isAdmin,
      } as ColumnMetaType,
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
          row.original as ClassType & { _optimistic?: boolean }
        )._optimistic;

        return (
          <div className="flex justify-end gap-2">
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
  const visibleColumns = columns.filter((col) => {
    const meta = col.meta as ColumnMetaType | undefined;
    return !meta?.hidden;
  });

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
        columns={visibleColumns}
        data={typedClassTypes}
        isLoading={isLoading && !typedClassTypes.length} // Only show loading state on initial load
        searchPlaceholder="クラスタイプを検索..."
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
          onOpenChange={(open: any) => !open && setClassTypeToEdit(null)}
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
              この操作は元に戻せません。クラスタイプ「{classTypeToDelete?.name}
              」を完全に削除します。
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
