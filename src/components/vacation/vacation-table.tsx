// src/components/vacation/vacation-table.tsx
"use client";

import { useState } from "react";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SortableDataTable } from "@/components/ui/sortable-data-table";
import {
  useVacationDelete,
  useVacationOrderUpdate,
  getResolvedVacationId,
} from "@/hooks/useVacationMutation";
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
import { useVacations } from "@/hooks/useVacationQuery";
import { useSession } from "next-auth/react";
import { VacationFormDialog } from "./vacation-form-dialog";

// Import types to ensure proper column meta support
import "@/components/data-table/types";

// Vacation type matching the API response
type Vacation = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  isRecurring: boolean;
  notes: string | null;
  order: number | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function VacationTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [isSortMode, setIsSortMode] = useState(false);
  const [localVacations, setLocalVacations] = useState<Vacation[]>([]);
  const pageSize = 10;

  const { data: vacations, isLoading } = useVacations({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const deleteVacationMutation = useVacationDelete();
  const updateOrderMutation = useVacationOrderUpdate();

  // Use local state during sort mode, otherwise use server data
  const typedVacations = isSortMode ? localVacations : vacations?.data || [];

  // Update local state when server data changes
  React.useEffect(() => {
    if (vacations?.data && !isSortMode) {
      setLocalVacations(vacations.data);
    }
  }, [vacations?.data, isSortMode]);

  const [vacationToEdit, setVacationToEdit] = useState<Vacation | null>(null);
  const [vacationToDelete, setVacationToDelete] = useState<Vacation | null>(
    null
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Format dates for display
  const formatDate = (date: string | Date) => {
    if (!date) return "-";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "yyyy/MM/dd");
  };

  const columns: ColumnDef<Vacation>[] = [
    {
      accessorKey: "name",
      header: "名前",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "startDate",
      header: "開始日",
      cell: ({ row }) => formatDate(row.original.startDate),
    },
    {
      accessorKey: "endDate",
      header: "終了日",
      cell: ({ row }) => formatDate(row.original.endDate),
    },
    {
      accessorKey: "isRecurring",
      header: "繰り返し",
      cell: ({ row }) => (
        <div>
          {row.original.isRecurring ? (
            <Badge variant="default">定期</Badge>
          ) : (
            <Badge variant="outline">単発</Badge>
          )}
        </div>
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
    const meta = col.meta;
    return !meta?.hidden;
  });

  const handleReorder = (items: Vacation[]) => {
    // Update local state immediately for visual feedback
    setLocalVacations(items);

    // Log the new order for debugging
    console.log(
      "New order:",
      items.map((item) => ({ id: item.id, name: item.name }))
    );

    // Resolve vacation IDs (handle temp vs server IDs) and send update request
    const vacationIds = items.map((item) => getResolvedVacationId(item.id));
    updateOrderMutation.mutate({ vacationIds });
  };

  const handleSortModeChange = (enabled: boolean) => {
    if (enabled && vacations?.data) {
      // When entering sort mode, sync local state with server data
      setLocalVacations(vacations.data);
    }
    setIsSortMode(enabled);
  };

  const handleDeleteVacation = () => {
    if (vacationToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedVacationId to resolve temp/server IDs
      const vacationId = getResolvedVacationId(vacationToDelete.id);
      setVacationToDelete(null);
      deleteVacationMutation.mutate(vacationId);
    }
  };

  const renderActions = (vacation: Vacation) => {
    // Type-safe check for _optimistic property
    const isOptimistic = (vacation as Vacation & { _optimistic?: boolean })
      ._optimistic;

    return (
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVacationToEdit(vacation)}
        >
          <Pencil className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVacationToDelete(vacation)}
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
        data={typedVacations}
        columns={visibleColumns}
        isSortMode={isSortMode}
        onSortModeChange={handleSortModeChange}
        onReorder={handleReorder}
        getItemId={(vacation) => vacation.id}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="休日を検索..."
        createLabel="新規作成"
        onCreateNew={() => setIsCreateDialogOpen(true)}
        isLoading={isLoading}
        pageIndex={page - 1}
        pageCount={Math.ceil((vacations?.pagination.total || 0) / pageSize)}
        pageSize={pageSize}
        totalItems={vacations?.pagination.total}
        onPageChange={(newPage) => setPage(newPage + 1)}
        renderActions={renderActions}
      />

      {/* Edit Vacation Dialog */}
      {vacationToEdit && (
        <VacationFormDialog
          open={!!vacationToEdit}
          onOpenChange={(open: boolean) => !open && setVacationToEdit(null)}
          vacation={vacationToEdit}
        />
      )}

      {/* Create Vacation Dialog */}
      <VacationFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!vacationToDelete}
        onOpenChange={(open) => !open && setVacationToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。休日「{vacationToDelete?.name}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteVacation}
              disabled={deleteVacationMutation.isPending}
            >
              {deleteVacationMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
