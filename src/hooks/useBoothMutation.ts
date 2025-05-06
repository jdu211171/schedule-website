import { fetcher } from "@/lib/fetcher";
import { CreateBoothInput, UpdateBoothInput } from "@/schemas/booth.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Booth } from "@prisma/client";
import { toast } from "sonner";

type CreateBoothResponse = {
  message: string;
  data: Booth;
};

type UpdateBoothResponse = {
  message: string;
  data: Booth;
};

type DeleteBoothResponse = {
  message: string;
};

type BoothsQueryData = {
  data: Booth[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Define context types for mutations
type BoothMutationContext = {
  previousBooths?: BoothsQueryData;
  previousBooth?: Booth;
  deletedBooth?: Booth;
  tempId?: string;
};

export function useBoothCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    CreateBoothResponse,
    Error,
    CreateBoothInput,
    BoothMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/booth", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newBooth) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["booths"] });

      // Snapshot the previous value
      const previousBooths = queryClient.getQueryData<BoothsQueryData>([
        "booths",
      ]);

      // Generate a temporary ID for optimistic update
      const tempId = `temp-${Date.now()}`;

      // Optimistically update to the new value
      if (previousBooths) {
        const optimisticBooth: Booth = {
          ...newBooth,
          boothId: tempId,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as Booth;

        queryClient.setQueryData<BoothsQueryData>(["booths"], (old) => {
          if (!old) return previousBooths;
          return {
            ...old,
            data: [...old.data, optimisticBooth],
            pagination: {
              ...old.pagination,
              total: old.pagination.total + 1,
            },
          };
        });
      }

      // Return the snapshot and temp ID for rollback
      return { previousBooths, tempId };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousBooths) {
        queryClient.setQueryData(["booths"], context.previousBooths);
      }

      toast.error("ブースの追加に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data) => {
      // No need to manually update the cache here, we'll rely on invalidation
      toast.success("ブースを追加しました", {
        description: data.message,
      });
    },
    onSettled: () => {
      // Always invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["booths"] });
    },
  });
}

export function useBoothUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateBoothResponse,
    Error,
    UpdateBoothInput,
    BoothMutationContext
  >({
    mutationFn: ({ boothId, ...data }) =>
      fetcher(`/api/booth`, {
        method: "PUT",
        body: JSON.stringify({ boothId, ...data }),
      }),
    onMutate: async (updatedBooth) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["booths"] });
      await queryClient.cancelQueries({
        queryKey: ["booth", updatedBooth.boothId],
      });

      // Snapshot the previous values
      const previousBooths = queryClient.getQueryData<BoothsQueryData>([
        "booths",
      ]);
      const previousBooth = queryClient.getQueryData<Booth>([
        "booth",
        updatedBooth.boothId,
      ]);

      // Create optimistic update with current timestamp
      const optimisticBooth = {
        ...(previousBooth || {}),
        ...updatedBooth,
        updatedAt: new Date(),
      };

      // Optimistically update to the new value
      if (previousBooths) {
        queryClient.setQueryData<BoothsQueryData>(["booths"], (old) => {
          if (!old) return previousBooths;
          return {
            ...old,
            data: old.data.map((booth) =>
              booth.boothId === updatedBooth.boothId
                ? (optimisticBooth as Booth)
                : booth
            ),
          };
        });
      }

      // Also update the single booth query if it exists
      if (previousBooth) {
        queryClient.setQueryData<Booth>(
          ["booth", updatedBooth.boothId],
          optimisticBooth as Booth
        );
      }

      // Return the snapshots for rollback
      return { previousBooths, previousBooth };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousBooths) {
        queryClient.setQueryData(["booths"], context.previousBooths);
      }

      if (context?.previousBooth) {
        queryClient.setQueryData(
          ["booth", variables.boothId],
          context.previousBooth
        );
      }

      toast.error("ブースの更新に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data) => {
      // No need to manually update cache here
      toast.success("ブースを更新しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, variables) => {
      // Always invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["booths"] });
      queryClient.invalidateQueries({
        queryKey: ["booth", variables.boothId],
      });
    },
  });
}

export function useBoothDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteBoothResponse, Error, string, BoothMutationContext>({
    mutationFn: (boothId) =>
      fetcher(`/api/booth?boothId=${boothId}`, {
        method: "DELETE",
      }),
    onMutate: async (boothId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["booths"] });
      await queryClient.cancelQueries({ queryKey: ["booth", boothId] });

      // Snapshot the previous value
      const previousBooths = queryClient.getQueryData<BoothsQueryData>([
        "booths",
      ]);

      // Save the booth being deleted for potential rollback
      const deletedBooth = previousBooths?.data.find(
        (booth) => booth.boothId === boothId
      );

      // Optimistically update by removing the booth
      if (previousBooths) {
        queryClient.setQueryData<BoothsQueryData>(["booths"], (old) => {
          if (!old) return previousBooths;
          return {
            ...old,
            data: old.data.filter((booth) => booth.boothId !== boothId),
            pagination: {
              ...old.pagination,
              total: old.pagination.total - 1,
            },
          };
        });
      }

      // Remove the single booth query if it exists
      queryClient.removeQueries({ queryKey: ["booth", boothId] });

      // Return the snapshot and deleted booth for rollback
      return { previousBooths, deletedBooth };
    },
    onError: (error, boothId, context) => {
      // Rollback on error
      if (context?.previousBooths) {
        queryClient.setQueryData(["booths"], context.previousBooths);
      }

      // If we have the deleted booth, restore it to the single query
      if (context?.deletedBooth) {
        queryClient.setQueryData(["booth", boothId], context.deletedBooth);
      }

      toast.error("ブースの削除に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data) => {
      toast.success("ブースを削除しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, boothId) => {
      // Always invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["booths"] });
      queryClient.invalidateQueries({ queryKey: ["booth", boothId] });
    },
  });
}
