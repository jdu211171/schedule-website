"use client";

import { useState, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { format, subDays } from "date-fns";
import { ja } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import { NotificationStatus } from "@prisma/client";

import { DataTable } from "@/components/data-table";
import { useNotifications, Notification } from "@/hooks/useNotificationQuery";
import { NotificationFilter } from "@/components/notification/notification-filter";

interface NotificationDataTableProps {
  columns: ColumnDef<Notification>[];
}

export function NotificationDataTable({ columns }: NotificationDataTableProps) {
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
    // Default to yesterday's notifications
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    return {
      status: undefined as NotificationStatus | undefined,
      recipientType: undefined as string | undefined,
      notificationType: undefined as string | undefined,
      startDate: yesterday,
      endDate: today,
    };
  });

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
  });

  const totalCount = notificationsData?.pagination.total || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleFilterChange = (
    field: keyof typeof filters,
    value: string | undefined
  ) => {
    setFilters({ ...filters, [field]: value });
    setPage(1); // Reset to first page when filter changes
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
    // Reset to yesterday's notifications
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
    const defaultFilters = {
      status: undefined,
      recipientType: undefined,
      notificationType: undefined,
      startDate: yesterday,
      endDate: today,
    };
    setFilters(defaultFilters);
    setPage(1);
    // Clear localStorage when resetting to defaults
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FILTERS_STORAGE_KEY);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage + 1);
  };

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
      searchPlaceholder="メッセージを検索..."
    />
  );
}