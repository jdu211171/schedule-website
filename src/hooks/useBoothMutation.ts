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

      // Optimistically update to the new value
      if (previousBooths) {
        queryClient.setQueryData<BoothsQueryData>(["booths"], {
          ...previousBooths,
          data: [
            ...previousBooths.data,
            {
              ...newBooth,
              boothId: `temp-${Date.now()}`, // Temporary ID until server responds
              createdAt: new Date(),
              updatedAt: new Date(),
            } as Booth,
          ],
          pagination: {
            ...previousBooths.pagination,
            total: previousBooths.pagination.total + 1,
          },
        });
      }

      // Return the snapshot for rollback
      return { previousBooths };
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
      // Directly update the cache with the response data
      const boothsData = queryClient.getQueryData<BoothsQueryData>(["booths"]);
      if (boothsData) {
        queryClient.setQueryData<BoothsQueryData>(["booths"], {
          ...boothsData,
          data: [...boothsData.data.filter(b => b.boothId !== `temp-${Date.now()}`), data.data],
          pagination: {
            ...boothsData.pagination,
            total: boothsData.pagination.total,
          },
        });
      }

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

      // Optimistically update to the new value
      if (previousBooths) {
        queryClient.setQueryData<BoothsQueryData>(["booths"], {
          ...previousBooths,
          data: previousBooths.data.map((booth) =>
            booth.boothId === updatedBooth.boothId
              ? { ...booth, ...updatedBooth, updatedAt: new Date() }
              : booth
          ),
        });
      }

      // Also update the single booth query if it exists
      if (previousBooth) {
        queryClient.setQueryData<Booth>(["booth", updatedBooth.boothId], {
          ...previousBooth,
          ...updatedBooth,
          updatedAt: new Date(),
        });
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
    onSuccess: (data, variables) => {
      // Update the cache with the actual server response data
      const updatedBooth = data.data;

      // Update booth list cache if it exists
      const boothsData = queryClient.getQueryData<BoothsQueryData>(["booths"]);
      if (boothsData) {
        queryClient.setQueryData<BoothsQueryData>(["booths"], {
          ...boothsData,
          data: boothsData.data.map((booth) =>
            booth.boothId === updatedBooth.boothId ? updatedBooth : booth
          ),
        });
      }

      // Update single booth cache
      queryClient.setQueryData<Booth>(
        ["booth", variables.boothId],
        updatedBooth
      );

      toast.success("ブースを更新しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, variables) => {
      // Always invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["booths"] });
      queryClient.invalidateQueries({ queryKey: ["booth", variables.boothId] });
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

      // Optimistically update by removing the booth
      if (previousBooths) {
        queryClient.setQueryData<BoothsQueryData>(["booths"], {
          ...previousBooths,
          data: previousBooths.data.filter(
            (booth) => booth.boothId !== boothId
          ),
          pagination: {
            ...previousBooths.pagination,
            total: previousBooths.pagination.total - 1,
          },
        });
      }

      // Remove the single booth query if it exists
      queryClient.removeQueries({ queryKey: ["booth", boothId] });

      // Return the snapshot for rollback
      return { previousBooths };
    },
    onError: (error, boothId, context) => {
      // Rollback on error
      if (context?.previousBooths) {
        queryClient.setQueryData(["booths"], context.previousBooths);
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
