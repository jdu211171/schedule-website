"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-table";
import { useVacationDelete, getResolvedVacationId } from "@/hooks/useVacationMutation";
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

// Define custom column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

// Vacation type matching the API response
type Vacation = {
  id: string;
  name: string;
  startDate: string | Date;
  endDate: string | Date;
  isRecurring: boolean;
  notes: string | null;
  branchId: string | null;
  branchName: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export function VacationTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: vacations, isLoading } = useVacations({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  // Ensure the data type returned by useVacations matches the expected type
  const typedVacations = vacations?.data || [];

  const totalCount = vacations?.pagination.total || 0;
  const deleteVacationMutation = useVacationDelete();

  const [vacationToEdit, setVacationToEdit] = useState<Vacation | null>(null);
  const [vacationToDelete, setVacationToDelete] = useState<Vacation | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Format dates for display
  const formatDate = (date: string | Date) => {
    if (!date) return "-";
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return format(dateObj, "yyyy/MM/dd");
  };

  const columns: ColumnDef<Vacation, unknown>[] = [
    {
      accessorKey: "name",
      header: "名前",
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
      header: "支店",
      cell: ({ row }) =>
        row.original.branchName ? (
          <Badge variant="outline">{row.original.branchName}</Badge>
        ) : (
          "-"
        ),
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
        const isOptimistic = (row.original as Vacation & { _optimistic?: boolean })
          ._optimistic;

        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVacationToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setVacationToDelete(row.original)}
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

  const handleDeleteVacation = () => {
    if (vacationToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedVacationId to resolve temp/server IDs
      const vacationId = getResolvedVacationId(vacationToDelete.id);
      setVacationToDelete(null);
      deleteVacationMutation.mutate(vacationId);
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
        data={typedVacations}
        isLoading={isLoading && !typedVacations.length} // Only show loading state on initial load
        searchPlaceholder="休日を検索..."
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

      {/* Edit Vacation Dialog */}
      {vacationToEdit && (
        <VacationFormDialog
          open={!!vacationToEdit}
          onOpenChange={(open: any) => !open && setVacationToEdit(null)}
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
