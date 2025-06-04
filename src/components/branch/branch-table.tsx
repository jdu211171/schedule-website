// src/components/branch/branch-table.tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import {
  useBranchDelete,
  getResolvedBranchId,
} from "@/hooks/useBranchMutation";
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
import { Branch } from "@/hooks/useBranchQuery";
import { BranchFormDialog } from "./branch-form-dialog";
import { useBranches } from "@/hooks/useBranchQuery";
import { useSession } from "next-auth/react";

// Define custom column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

export function BranchTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: branches, isLoading } = useBranches({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  // Ensure the data type returned by useBranches matches the expected type
  const typedBranches = branches?.data || [];

  const totalCount = branches?.pagination.total || 0;
  const deleteBranchMutation = useBranchDelete();

  const currentBranch = localStorage.getItem('selectedBranchId')

  const [branchToEdit, setBranchToEdit] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<Branch, unknown>[] = [
    {
      accessorKey: "name",
      header: "名前",
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
          row.original as Branch & { _optimistic?: boolean }
        )._optimistic;

        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setBranchToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              disabled={row.original.branchId === currentBranch && true}
              variant="ghost"
              size="icon"
              onClick={() => setBranchToDelete(row.original)}
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

  const handleDeleteBranch = () => {
    if (branchToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedBranchId to resolve temp/server IDs
      const branchId = getResolvedBranchId(branchToDelete.branchId);
      setBranchToDelete(null);
      deleteBranchMutation.mutate(branchId);
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
        data={typedBranches}
        isLoading={isLoading && !typedBranches.length} // Only show loading state on initial load
        searchPlaceholder="支店を検索..."
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

      {/* Edit Branch Dialog */}
      {branchToEdit && (
        <BranchFormDialog
          open={!!branchToEdit}
          onOpenChange={(open) => !open && setBranchToEdit(null)}
          branch={branchToEdit}
        />
      )}

      {/* Create Branch Dialog */}
      <BranchFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!branchToDelete}
        onOpenChange={(open) => !open && setBranchToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。支店「{branchToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBranch}
              disabled={deleteBranchMutation.isPending}
            >
              {deleteBranchMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
