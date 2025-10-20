"use client";

import { useState } from "react";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2, Download } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { SortableDataTable } from "@/components/ui/sortable-data-table";
import {
  useDeleteAdminUser,
  useUpdateAdminUserOrder,
} from "@/hooks/useAdminUserMutation";
import { useGenericExport } from "@/hooks/useGenericExport";
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
import { AdminUserFormDialog } from "./admin-user-form-dialog";
import { AdminUser, useAdminUsers } from "@/hooks/useAdminUserQuery";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CSVImportDialog } from "@/components/ui/csv-import-dialog";

export function AdminUserTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [isSortMode, setIsSortMode] = useState(false);
  const [localAdminUsers, setLocalAdminUsers] = useState<AdminUser[]>([]);
  const pageSize = 10;
  const queryClient = useQueryClient();
  const { data: adminUsers, isLoading } = useAdminUsers({
    page,
    limit: pageSize,
    search: searchTerm || undefined,
  });

  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const currentUserOrder = React.useMemo(() => {
    const currentUser = adminUsers?.data.find((u) => u.id === currentUserId);
    return currentUser?.order ?? Number.MAX_SAFE_INTEGER;
  }, [adminUsers?.data, currentUserId]);

  const typedAdminUsers = adminUsers?.data || [];

  const totalCount = adminUsers?.pagination.total || 0;
  const deleteAdminUserMutation = useDeleteAdminUser();
  const updateOrderMutation = useUpdateAdminUserOrder();
  const { exportToCSV, isExporting } = useGenericExport(
    "/api/admins/export",
    "admins"
  );

  const [adminUserToEdit, setAdminUserToEdit] = useState<AdminUser | null>(
    null
  );
  const [adminUserToDelete, setAdminUserToDelete] = useState<AdminUser | null>(
    null
  );
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const columns: ColumnDef<AdminUser, unknown>[] = [
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
      accessorKey: "isRestrictedAdmin",
      header: "権限",
      cell: ({ row }) => {
        const isRestricted = row.original.isRestrictedAdmin;
        return (
          <Badge variant={isRestricted ? "secondary" : "default"}>
            {isRestricted ? "制限付き" : "完全"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "作成日",
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return date.toLocaleDateString("ja-JP");
      },
    },
  ];

  const handleReorder = (items: AdminUser[]) => {
    // Filter to only include admins that the current user can reorder
    const currentUser = adminUsers?.data.find((u) => u.id === currentUserId);

    if (!currentUser) {
      toast.error("現在のユーザーが見つかりません");
      return;
    }

    console.log("Reorder attempt:", {
      currentUserId,
      currentUserOrder,
      itemsToReorder: items.map((item) => ({
        id: item.id,
        order: item.order,
        name: item.name,
      })),
    });

    // Separate admins into those the current user can and cannot reorder
    const adminsThatCanBeReordered: AdminUser[] = [];
    const adminsThatCannotBeReordered: AdminUser[] = [];

    items.forEach((item) => {
      if (item.id === currentUserId) {
        // Current user can always include themselves
        adminsThatCanBeReordered.push(item);
      } else {
        const itemOrder = item.order ?? Number.MAX_SAFE_INTEGER;
        console.log(
          `Checking item ${item.name} (order: ${itemOrder}) vs current user order: ${currentUserOrder}`
        );

        if (itemOrder > currentUserOrder) {
          // This admin is below current user, can be reordered
          adminsThatCanBeReordered.push(item);
        } else {
          // This admin is above or equal to current user, cannot be reordered
          adminsThatCannotBeReordered.push(item);
        }
      }
    });

    console.log(
      "Admins that can be reordered:",
      adminsThatCanBeReordered.map((item) => ({
        id: item.id,
        order: item.order,
        name: item.name,
      }))
    );
    console.log(
      "Admins that cannot be reordered:",
      adminsThatCannotBeReordered.map((item) => ({
        id: item.id,
        order: item.order,
        name: item.name,
      }))
    );

    // If there are any admins that cannot be reordered, show error
    if (adminsThatCannotBeReordered.length > 0) {
      toast.error(
        "同じまたは上位の権限を持つ管理者の順序を変更することはできません"
      );
      return;
    }

    // Update local state immediately for visual feedback
    setLocalAdminUsers(items);

    // Log the new order for debugging
    console.log(
      "New admin order:",
      items.map((item) => ({ id: item.id, name: item.name, order: item.order }))
    );

    // Send update request - only include admins that can be reordered
    const userIds = items.map((item) => item.id);
    updateOrderMutation.mutate({ userIds });
  };

  const handleSortModeChange = (enabled: boolean) => {
    if (enabled && adminUsers?.data) {
      // When entering sort mode, sync local state with server data
      setLocalAdminUsers(adminUsers.data);
    }
    setIsSortMode(enabled);
  };

  const handleDeleteAdminUser = () => {
    if (adminUserToDelete) {
      setAdminUserToDelete(null);
      deleteAdminUserMutation.mutate(adminUserToDelete.id);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  // Use local data in sort mode, otherwise use server data
  const displayData = isSortMode ? localAdminUsers : typedAdminUsers;

  // Only show sort mode to admins with order 1 (top admin)
  const canAccessSortMode = currentUserOrder === 1;

  const handleExport = () => {
    // Get visible columns (all columns except actions)
    const visibleColumns = columns
      .map((col) => (col as any).accessorKey)
      .filter((key) => key) as string[];
    exportToCSV({ columns: visibleColumns });
  };

  const handleImport = () => {
    setIsImportDialogOpen(true);
  };

  const handleImportComplete = () => {
    // Refresh the data after successful import
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    setPage(1); // Reset to first page
  };

  return (
    <>
      <SortableDataTable
        data={displayData as unknown as Record<string, unknown>[]}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        columns={columns as any}
        isSortMode={isSortMode}
        onSortModeChange={handleSortModeChange}
        onReorder={(items) => handleReorder(items as unknown as AdminUser[])}
        getItemId={(user) => (user as unknown as AdminUser).id}
        showSortMode={canAccessSortMode}
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="管理者を検索..."
        createLabel="新規作成"
        onCreateNew={() => setIsCreateDialogOpen(true)}
        isLoading={isLoading && !displayData.length}
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        pageSize={pageSize}
        totalItems={totalCount}
        onPageChange={handlePageChange}
        onExport={handleExport}
        isExporting={isExporting}
        onImport={handleImport}
        renderActions={(user) => {
          const adminUser = user as unknown as AdminUser;
          const isSelf = adminUser.id === currentUserId;
          const targetUserOrder = adminUser.order ?? Number.MAX_SAFE_INTEGER;
          const canEdit = !isSelf && targetUserOrder > currentUserOrder;

          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAdminUserToEdit(adminUser)}
                disabled={!canEdit}
                title={
                  isSelf
                    ? "自分自身を編集することはできません"
                    : !canEdit
                      ? "同じまたは上位の権限を持つ管理者を編集することはできません"
                      : undefined
                }
              >
                <Pencil className={`h-4 w-4 ${!canEdit ? "opacity-50" : ""}`} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setAdminUserToDelete(adminUser)}
                disabled={!canEdit}
                title={
                  isSelf
                    ? "自分自身を削除することはできません"
                    : !canEdit
                      ? "同じまたは上位の権限を持つ管理者を削除することはできません"
                      : undefined
                }
              >
                <Trash2
                  className={`h-4 w-4 text-destructive ${
                    !canEdit ? "opacity-50" : ""
                  }`}
                />
              </Button>
            </div>
          );
        }}
      />

      {/* Edit Admin User Dialog */}
      {adminUserToEdit && (
        <AdminUserFormDialog
          open={!!adminUserToEdit}
          onOpenChange={(open) => !open && setAdminUserToEdit(null)}
          adminUser={adminUserToEdit}
        />
      )}

      {/* Create Admin User Dialog */}
      <AdminUserFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!adminUserToDelete}
        onOpenChange={(open) => !open && setAdminUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。管理者「
              {adminUserToDelete?.name || adminUserToDelete?.username}
              」を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAdminUser}
              disabled={deleteAdminUserMutation.isPending}
            >
              {deleteAdminUserMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Dialog */}
      <CSVImportDialog
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        title="管理者をインポート"
        description="CSVファイルから管理者データを一括インポートします"
        templateUrl="/api/import/admins/template"
        importUrl="/api/import/admins"
        onImportComplete={handleImportComplete}
      />
    </>
  );
}
