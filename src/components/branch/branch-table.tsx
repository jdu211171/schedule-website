// src/components/branch/branch-table.tsx
"use client";

import { useState } from "react";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGenericExport } from "@/hooks/useGenericExport";
import { SortableDataTable } from "@/components/ui/sortable-data-table";
import { useBranches } from "@/hooks/useBranchQuery";
import { useQueryClient } from "@tanstack/react-query";
import {
  useBranchUpdate,
  useBranchDelete,
  useBranchOrderUpdate,
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
import { CSVImportDialog } from "@/components/ui/csv-import-dialog";

export function BranchTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [isSortMode, setIsSortMode] = useState(false);
  const [localBranches, setLocalBranches] = useState<Branch[]>([]);
  const pageSize = 10;
  const queryClient = useQueryClient();

  const { data: branches, isLoading } = useBranches({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const updateBranchMutation = useBranchUpdate();
  const deleteBranchMutation = useBranchDelete();
  const updateOrderMutation = useBranchOrderUpdate();
  const { exportToCSV, isExporting } = useGenericExport("/api/branches/export", "branches");

  const currentBranch = localStorage.getItem("selectedBranchId");

  // Use local state during sort mode, otherwise use server data
  const typedBranches = isSortMode ? localBranches : branches?.data || [];

  // Update local state when server data changes
  React.useEffect(() => {
    if (branches?.data && !isSortMode) {
      setLocalBranches(branches.data);
    }
  }, [branches?.data, isSortMode]);

  const [branchToEdit, setBranchToEdit] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const columns: ColumnDef<Branch>[] = [
    {
      accessorKey: "name",
      header: "名前",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "notes",
      header: "メモ",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.notes || "-"}
        </span>
      ),
    },
  ];

  const handleReorder = (items: Branch[]) => {
    // Update local state immediately for visual feedback
    setLocalBranches(items);

    // Log the new order for debugging
    console.log(
      "New order:",
      items.map((item) => ({ id: item.branchId, name: item.name }))
    );

    // Resolve branch IDs (handle temp vs server IDs) and send update request
    const branchIds = items.map((item) => getResolvedBranchId(item.branchId));
    updateOrderMutation.mutate({ branchIds });
  };

  const handleSortModeChange = (enabled: boolean) => {
    if (enabled && branches?.data) {
      // When entering sort mode, sync local state with server data
      setLocalBranches(branches.data);
    }
    setIsSortMode(enabled);
  };


  const renderActions = (branch: Branch) => {
    // Type-safe check for _optimistic property
    const isOptimistic = (branch as Branch & { _optimistic?: boolean })
      ._optimistic;

    return (
      <div className="flex justify-end gap-2">
        <Button
          disabled={branch.branchId === currentBranch}
          variant="ghost"
          size="icon"
          onClick={() => setBranchToEdit(branch)}
        >
          <Pencil className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`} />
        </Button>
        <Button
          disabled={branch.branchId === currentBranch}
          variant="ghost"
          size="icon"
          onClick={() => setBranchToDelete(branch)}
        >
          <Trash2
            className={`h-4 w-4 text-destructive ${
              isOptimistic ? "opacity-70" : ""
            }`}
          />
        </Button>
      </div>
    );
  };

  const handleDeleteBranch = () => {
    if (branchToDelete) {
      const branchId = getResolvedBranchId(branchToDelete.branchId);
      setBranchToDelete(null);
      deleteBranchMutation.mutate(branchId);
    }
  };

  const handleExport = () => {
    // Get visible columns (all columns except actions)
    const visibleColumns = columns
      .map(col => (col as any).accessorKey)
      .filter(key => key) as string[];
    exportToCSV({ columns: visibleColumns });
  };

  const handleImport = () => {
    setIsImportDialogOpen(true);
  };

  const handleImportComplete = () => {
    // Refresh the data after successful import
    // Invalidate the branches query to refetch data
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    // Reset page to 1 to see newly imported data
    setPage(1);
  };

  return (
    <>
      <SortableDataTable
        data={typedBranches}
        columns={columns}
        isSortMode={isSortMode}
        onSortModeChange={handleSortModeChange}
        onReorder={handleReorder}
        getItemId={(branch) => branch.branchId}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="校舎を検索..."
        createLabel="新規作成"
        onCreateNew={() => setIsCreateDialogOpen(true)}
        isLoading={isLoading}
        pageIndex={page - 1}
        pageCount={Math.ceil((branches?.pagination.total || 0) / pageSize)}
        pageSize={pageSize}
        totalItems={branches?.pagination.total}
        onPageChange={(newPage) => setPage(newPage + 1)}
        renderActions={renderActions}
        isItemDisabled={(branch) => branch.branchId === currentBranch}
        onExport={handleExport}
        isExporting={isExporting}
        onImport={handleImport}
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
              この操作は元に戻せません。校舎「{branchToDelete?.name}
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

      {/* Import Dialog */}
      <CSVImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="校舎をインポート"
        description="CSVファイルから校舎データを一括インポートします"
        templateUrl="/api/import/branches/template"
        importUrl="/api/import/branches"
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
