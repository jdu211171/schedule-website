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
    />
  );
}