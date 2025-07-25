"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import { NotificationStatus } from "@prisma/client";

import { DataTable } from "@/components/data-table";
import { useNotifications, Notification } from "@/hooks/useNotificationQuery";
import { NotificationFilter } from "@/components/notification/notification-filter";
import { createColumns } from "./columns";
import {
  useNotificationDelete,
  useNotificationBulkDelete,
} from "@/hooks/useNotificationMutation";
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

export function NotificationDataTable() {
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Storage key for filter persistence
  const FILTERS_STORAGE_KEY = "notification_filters";

  // Initialize filters with localStorage values or defaults (yesterday)
  const [filters, setFilters] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedFilters = localStorage.getItem(FILTERS_STORAGE_KEY);
      if (savedFilters) {
        try {
          return JSON.parse(savedFilters);
        } catch (error) {
          console.error('Error parsing saved filters:', error);
        }
      }
    }
    // Default to today's notifications
    const today = format(new Date(), "yyyy-MM-dd");
    const tomorrow = format(new Date(new Date().setDate(new Date().getDate() + 1)), "yyyy-MM-dd");
    return {
      status: undefined as NotificationStatus | undefined,
      recipientType: undefined as string | undefined,
      notificationType: undefined as string | undefined,
      startDate: today,
      endDate: tomorrow,
      search: undefined as string | undefined,
    };
  });

  // Separate search state for immediate UI updates and debounced API calls
  const [searchValue, setSearchValue] = useState(filters.search || "");

  // Debounce search to avoid too many API calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters((prev: typeof filters) => ({ ...prev, search: searchValue || undefined }));
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchValue]);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    }
  }, [filters]);

  // Fetch notifications with filters
  const { data: notificationsData, isLoading } = useNotifications({
    page,
    limit: pageSize,
    status: filters.status,
    recipientType: filters.recipientType,
    notificationType: filters.notificationType,
    startDate: filters.startDate,
    endDate: filters.endDate,
    search: filters.search,
  });

  const totalCount = notificationsData?.pagination.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Delete mutations
  const deleteNotificationMutation = useNotificationDelete();
  const bulkDeleteNotificationMutation = useNotificationBulkDelete();

  // State for delete dialogs
  const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);
  const [selectedRowsForDeletion, setSelectedRowsForDeletion] = useState<Notification[]>([]);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState(false);

  const handleFilterChange = (
    field: keyof typeof filters,
    value: string | undefined
  ) => {
    setFilters({ ...filters, [field]: value });
    setPage(1); // Reset to first page when filter changes
    
    // If this is a search change, also update the search value for immediate UI feedback
    if (field === 'search') {
      setSearchValue(value || "");
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setFilters({
      ...filters,
      startDate: range?.from ? format(range.from, "yyyy-MM-dd") : undefined,
      endDate: range?.to ? format(range.to, "yyyy-MM-dd") : undefined,
    });
    setPage(1); // Reset to first page when filter changes
  };

  const resetFilters = () => {
    // Reset to today's notifications
    const today = format(new Date(), "yyyy-MM-dd");
    const tomorrow = format(new Date(new Date().setDate(new Date().getDate() + 1)), "yyyy-MM-dd");
    const defaultFilters = {
      status: undefined,
      recipientType: undefined,
      notificationType: undefined,
      startDate: today,
      endDate: tomorrow,
      search: undefined,
    };
    setFilters(defaultFilters);
    setSearchValue("");
    setPage(1);
    // Clear localStorage when resetting to defaults
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FILTERS_STORAGE_KEY);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

  // Delete handlers
  const handleDeleteNotification = () => {
    if (notificationToDelete) {
      const notificationId = notificationToDelete.notificationId;
      setNotificationToDelete(null);
      deleteNotificationMutation.mutate(notificationId);
    }
  };

  const handleBulkDelete = (selectedRowData: Notification[]) => {
    if (selectedRowData.length === 0) return;
    setSelectedRowsForDeletion(selectedRowData);
    setIsConfirmingBulkDelete(true);
  };

  const confirmBulkDelete = () => {
    if (selectedRowsForDeletion.length === 0) return;

    const notificationIds = selectedRowsForDeletion.map(
      (notification) => notification.notificationId
    );
    bulkDeleteNotificationMutation.mutate({ notificationIds });

    // Clear selection and close dialog
    setSelectedRowsForDeletion([]);
    setIsConfirmingBulkDelete(false);
  };

  // Create columns with delete handler
  const columns = createColumns((notification) => setNotificationToDelete(notification));

  // Create filter component for the DataTable
  const filterComponent = (
    <NotificationFilter
      filters={filters}
      onFilterChange={handleFilterChange}
      onDateRangeChange={handleDateRangeChange}
      onResetFilters={resetFilters}
    />
  );

  return (
    <>
      <DataTable
        columns={columns}
        data={notificationsData?.data || []}
        isLoading={isLoading}
        pageIndex={page - 1}
        pageCount={totalPages || 1}
        onPageChange={handlePageChange}
        pageSize={pageSize}
        totalItems={totalCount}
        filterComponent={filterComponent}
        enableRowSelection={true}
        onBatchDelete={handleBulkDelete}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!notificationToDelete}
        onOpenChange={(open) => !open && setNotificationToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。この通知を完全に削除します。
              {notificationToDelete?.recipientName && (
                <div className="mt-2">
                  宛先: <strong>{notificationToDelete.recipientName}</strong>
                </div>
              )}
              {notificationToDelete?.message && (
                <div className="mt-1 text-sm">
                  メッセージ:{" "}
                  {notificationToDelete.message.length > 50
                    ? `${notificationToDelete.message.substring(0, 50)}...`
                    : notificationToDelete.message}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNotification}
              disabled={deleteNotificationMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteNotificationMutation.isPending ? "削除中..." : "削除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={isConfirmingBulkDelete}
        onOpenChange={(open) => !open && setIsConfirmingBulkDelete(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>選択した通知を一括削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。
              選択された<strong>{selectedRowsForDeletion.length}件</strong>
              の通知を完全に削除します。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              disabled={bulkDeleteNotificationMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleteNotificationMutation.isPending
                ? "削除中..."
                : `${selectedRowsForDeletion.length}件を削除`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}