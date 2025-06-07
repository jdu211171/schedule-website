// src/components/booth/booth-table.tsx
"use client";

import { useState } from "react";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortableDataTable } from "@/components/ui/sortable-data-table";
import {
  useBoothDelete,
  useBoothOrderUpdate,
  getResolvedBoothId,
} from "@/hooks/useBoothMutation";
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
import { Booth } from "@prisma/client";
import { BoothFormDialog } from "./booth-form-dialog";
import { useBooths } from "@/hooks/useBoothQuery";
import { useSession } from "next-auth/react";

// Define extended booth type that includes branchName and order
type ExtendedBooth = Booth & {
  branchName: string;
  order: number | null;
  _optimistic?: boolean;
};

export function BoothTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [isSortMode, setIsSortMode] = useState(false);
  const [localBooths, setLocalBooths] = useState<ExtendedBooth[]>([]);
  const pageSize = 10;

  const { data: booths, isLoading } = useBooths({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const deleteBoothMutation = useBoothDelete();
  const updateOrderMutation = useBoothOrderUpdate();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // Use local state during sort mode, otherwise use server data
  const typedBooths = isSortMode ? localBooths : booths?.data || [];

  // Update local state when server data changes
  React.useEffect(() => {
    if (booths?.data && !isSortMode) {
      setLocalBooths(booths.data);
    }
  }, [booths?.data, isSortMode]);

  const [boothToEdit, setBoothToEdit] = useState<ExtendedBooth | null>(null);
  const [boothToDelete, setBoothToDelete] = useState<ExtendedBooth | null>(
    null
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<ExtendedBooth>[] = [
    {
      accessorKey: "name",
      header: "名前",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "ステータス",
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.status ? "使用可" : "使用不可"}
        </Badge>
      ),
    },
    {
      accessorKey: "branchName",
      header: "校舎",
      cell: ({ row }) =>
        row.original.branchName ? (
          <Badge variant="outline">{row.original.branchName}</Badge>
        ) : (
          "-"
        ),
      // Only show for admins
      meta: {
        hidden: !isAdmin,
      },
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

  // Filter out the branch column if user is not admin
  const visibleColumns = columns.filter((col) => {
    const meta = col.meta as any;
    return !meta?.hidden;
  });

  const handleReorder = (items: ExtendedBooth[]) => {
    // Update local state immediately for visual feedback
    setLocalBooths(items);

    // Log the new order for debugging
    console.log(
      "New order:",
      items.map((item) => ({ id: item.boothId, name: item.name }))
    );

    // Resolve booth IDs (handle temp vs server IDs) and send update request
    const boothIds = items.map((item) => getResolvedBoothId(item.boothId));
    updateOrderMutation.mutate({ boothIds });
  };

  const handleSortModeChange = (enabled: boolean) => {
    if (enabled && booths?.data) {
      // When entering sort mode, sync local state with server data
      setLocalBooths(booths.data);
    }
    setIsSortMode(enabled);
  };

  const handleDeleteBooth = () => {
    if (boothToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedBoothId to resolve temp/server IDs
      const boothId = getResolvedBoothId(boothToDelete.boothId);
      setBoothToDelete(null);
      deleteBoothMutation.mutate(boothId);
    }
  };

  const renderActions = (booth: ExtendedBooth) => {
    // Type-safe check for _optimistic property
    const isOptimistic = booth._optimistic;

    return (
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setBoothToEdit(booth)}
        >
          <Pencil className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setBoothToDelete(booth)}
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

  return (
    <>
      <SortableDataTable
        data={typedBooths}
        columns={visibleColumns}
        isSortMode={isSortMode}
        onSortModeChange={handleSortModeChange}
        onReorder={handleReorder}
        getItemId={(booth) => booth.boothId}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="ブースを検索..."
        createLabel="新規作成"
        onCreateNew={() => setIsCreateDialogOpen(true)}
        isLoading={isLoading}
        pageIndex={page - 1}
        pageCount={Math.ceil((booths?.pagination.total || 0) / pageSize)}
        pageSize={pageSize}
        totalItems={booths?.pagination.total}
        onPageChange={(newPage) => setPage(newPage + 1)}
        renderActions={renderActions}
      />

      {/* Edit Booth Dialog */}
      {boothToEdit && (
        <BoothFormDialog
          open={!!boothToEdit}
          onOpenChange={(open) => !open && setBoothToEdit(null)}
          booth={boothToEdit}
        />
      )}

      {/* Create Booth Dialog */}
      <BoothFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!boothToDelete}
        onOpenChange={(open) => !open && setBoothToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。ブース「{boothToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBooth}
              disabled={deleteBoothMutation.isPending}
            >
              {deleteBoothMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
