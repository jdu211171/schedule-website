import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetcher, CustomError } from "@/lib/fetcher";
import { NotificationBulkDelete } from "@/schemas/notification.schema";

// Helper function to extract error message from CustomError or regular Error
const getErrorMessage = (error: Error): string => {
  if (error instanceof CustomError) {
    return (error.info.error as string) || error.message;
  }
  return error.message;
};

interface NotificationResponse {
  data: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface BulkDeleteResponse {
  data: [];
  message: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

interface NotificationMutationContext {
  previousNotifications: Record<string, NotificationResponse>;
}

// Hook for deleting a single notification
export function useNotificationDelete() {
  const queryClient = useQueryClient();
  
  return useMutation<void, Error, string, NotificationMutationContext>({
    mutationFn: (notificationId) => 
      fetcher(`/api/notifications/${notificationId}`, {
        method: "DELETE",
      }),
    onMutate: async (notificationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      // Snapshot all notification queries
      const queries = queryClient.getQueriesData<NotificationResponse>({
        queryKey: ["notifications"],
      });

      const previousNotifications: Record<string, NotificationResponse> = {};

      // Save all notification queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousNotifications[JSON.stringify(queryKey)] = data;
        }
      });

      // Optimistically remove the notification from all queries
      queries.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData<NotificationResponse>(queryKey, {
            ...data,
            data: data.data.filter(
              (notification) => notification.notificationId !== notificationId
            ),
            pagination: {
              ...data.pagination,
              total: data.pagination.total - 1,
            },
          });
        }
      });

      return { previousNotifications };
    },
    onError: (error, _, context) => {
      if (context?.previousNotifications) {
        Object.entries(context.previousNotifications).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      toast.error("通知の削除に失敗しました", {
        id: "notification-delete-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("通知を削除しました", {
        id: "notification-delete-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
        refetchType: "none",
      });
    },
  });
}

// Hook for bulk deleting notifications
export function useNotificationBulkDelete() {
  const queryClient = useQueryClient();

  return useMutation<
    BulkDeleteResponse,
    Error,
    NotificationBulkDelete,
    NotificationMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/notifications", {
        method: "DELETE",
        body: JSON.stringify(data),
      }),
    onMutate: async (bulkDeleteData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["notifications"] });

      const { notificationIds } = bulkDeleteData;

      // Snapshot all notification queries
      const queries = queryClient.getQueriesData<NotificationResponse>({
        queryKey: ["notifications"],
      });

      const previousNotifications: Record<string, NotificationResponse> = {};

      // Save all notification queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousNotifications[JSON.stringify(queryKey)] = data;
        }
      });

      // Optimistically remove the notifications from all queries
      queries.forEach(([queryKey, data]) => {
        if (data) {
          const remainingNotifications = data.data.filter(
            (notification) => !notificationIds.includes(notification.notificationId)
          );
          const removedCount = data.data.length - remainingNotifications.length;

          queryClient.setQueryData<NotificationResponse>(queryKey, {
            ...data,
            data: remainingNotifications,
            pagination: {
              ...data.pagination,
              total: data.pagination.total - removedCount,
            },
          });
        }
      });

      return { previousNotifications };
    },
    onError: (error, _, context) => {
      if (context?.previousNotifications) {
        Object.entries(context.previousNotifications).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      toast.error("通知の一括削除に失敗しました", {
        id: "notification-bulk-delete-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (response) => {
      toast.success(response.message || "通知を削除しました", {
        id: "notification-bulk-delete-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["notifications"],
        refetchType: "none",
      });
    },
  });
}