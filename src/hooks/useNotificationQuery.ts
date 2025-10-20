"use client";

import { useQuery } from "@tanstack/react-query";
import { NotificationStatus } from "@prisma/client";

interface NotificationFilters {
  page?: number;
  limit?: number;
  status?: NotificationStatus;
  recipientType?: string;
  notificationType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

interface Notification {
  notificationId: string;
  recipientType: string | null;
  recipientId: string | null;
  recipientName: string | null;
  notificationType: string | null;
  message: string | null;
  relatedClassId: string | null;
  branchId: string | null;
  branchName: string | null;
  sentVia: string | null;
  sentAt: string | null;
  readAt: string | null;
  status: NotificationStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  scheduledAt: string;
  processingAttempts: number;
  logs: any;
}

interface NotificationResponse {
  data: Notification[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export function useNotifications(filters: NotificationFilters = {}) {
  return useQuery<NotificationResponse>({
    queryKey: ["notifications", filters],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      // Add pagination
      if (filters.page) searchParams.set("page", filters.page.toString());
      if (filters.limit) searchParams.set("limit", filters.limit.toString());

      // Add filters
      if (filters.status) searchParams.set("status", filters.status);
      if (filters.recipientType)
        searchParams.set("recipientType", filters.recipientType);
      if (filters.notificationType)
        searchParams.set("notificationType", filters.notificationType);
      if (filters.startDate) searchParams.set("startDate", filters.startDate);
      if (filters.endDate) searchParams.set("endDate", filters.endDate);
      if (filters.search) searchParams.set("search", filters.search);

      const response = await fetch(
        `/api/notifications?${searchParams.toString()}`,
        {
          headers: {
            "X-Selected-Branch": localStorage.getItem("selectedBranchId") || "",
          },
        }
      );

      if (!response.ok) {
        throw new Error("通知の取得に失敗しました");
      }

      return response.json();
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
}

export type { Notification, NotificationFilters, NotificationResponse };
