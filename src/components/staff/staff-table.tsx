// src/components/staff/staff-table.tsx
"use client";

import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table";
import { useStaffDelete, getResolvedStaffId } from "@/hooks/useStaffMutation";
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
import { StaffFormDialog } from "./staff-form-dialog";
import { Staff, useStaffs } from "@/hooks/useStaffQuery";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";

// Define custom column meta type
interface ColumnMetaType {
  align?: "left" | "center" | "right";
  headerClassName?: string;
  cellClassName?: string;
  hidden?: boolean;
}

export function StaffTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { data: staffs, isLoading } = useStaffs({
    page,
    limit: pageSize,
    name: searchTerm || undefined,
  });

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // Ensure the data type returned by useStaffs matches the expected type
  const typedStaffs = staffs?.data || [];

  const totalCount = staffs?.pagination.total || 0;
  const deleteStaffMutation = useStaffDelete();

  const [staffToEdit, setStaffToEdit] = useState<Staff | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<Staff | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const columns: ColumnDef<Staff, unknown>[] = [
    {
      accessorKey: "username",
      header: "ユーザー名",
    },
    {
      accessorKey: "name",
      header: "名前",
      cell: ({ row }) => row.original.name || "-",
    },
    {
      accessorKey: "email",
      header: "メールアドレス",
      cell: ({ row }) => row.original.email || "-",
    },
    {
      accessorKey: "branches",
      header: "校舎",
      cell: ({ row }) => {
        const branches = row.original.branches || [];
        if (branches.length === 0) return "-";

        return (
          <div className="flex flex-wrap gap-1">
            {branches.map((branch) => (
              <Badge key={branch.branchId} variant="outline">
                {branch.name}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        // Type-safe check for _optimistic property
        const isOptimistic = (row.original as Staff & { _optimistic?: boolean })
          ._optimistic;

        // Prevent deleting self
        const isSelf = row.original.id === currentUserId;

        return (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStaffToEdit(row.original)}
            >
              <Pencil
                className={`h-4 w-4 ${isOptimistic ? "opacity-70" : ""}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStaffToDelete(row.original)}
              disabled={isSelf} // Prevent deleting self
              title={isSelf ? "自分自身を削除することはできません" : undefined}
            >
              <Trash2
                className={`h-4 w-4 text-destructive ${
                  isOptimistic || isSelf ? "opacity-70" : ""
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

  const handleDeleteStaff = () => {
    if (staffToDelete) {
      // Close the dialog immediately for better UX
      // Use getResolvedStaffId to resolve temp/server IDs
      const staffId = getResolvedStaffId(staffToDelete.id);
      setStaffToDelete(null);
      deleteStaffMutation.mutate(staffId);
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
        data={typedStaffs}
        isLoading={isLoading && !typedStaffs.length} // Only show loading state on initial load
        searchPlaceholder="スタッフを検索..."
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

      {/* Edit Staff Dialog */}
      {staffToEdit && (
        <StaffFormDialog
          open={!!staffToEdit}
          onOpenChange={(open) => !open && setStaffToEdit(null)}
          staff={staffToEdit}
        />
      )}

      {/* Create Staff Dialog */}
      <StaffFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!staffToDelete}
        onOpenChange={(open) => !open && setStaffToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。スタッフ「
              {staffToDelete?.name || staffToDelete?.username}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStaff}
              disabled={deleteStaffMutation.isPending}
            >
              {deleteStaffMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
