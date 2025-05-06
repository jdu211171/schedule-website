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
  previousBooths?: Record<string, BoothsQueryData>;
  previousBooth?: Booth;
  deletedBooth?: Booth;
  tempId?: string;
};

export function useBoothCreate() {
  const queryClient = useQueryClient();
  // Store tempId for use in onSuccess
  let tempIdRef: string | undefined;
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
      await queryClient.cancelQueries({ queryKey: ["booths"] });
      const queries = queryClient.getQueriesData<BoothsQueryData>({
        queryKey: ["booths"],
      });
      const previousBooths: Record<string, BoothsQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousBooths[JSON.stringify(queryKey)] = data;
        }
      });
      const tempId = `temp-${Date.now()}`;
      tempIdRef = tempId;
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<BoothsQueryData>(queryKey);
        if (currentData) {
          const optimisticBooth: Booth = {
            ...newBooth,
            boothId: tempId,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Booth;
          queryClient.setQueryData<BoothsQueryData>(queryKey, {
            ...currentData,
            data: [optimisticBooth, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          });
        }
      });
      return { previousBooths, tempId };
    },
    onError: (error, _, context) => {
      if (context?.previousBooths) {
        Object.entries(context.previousBooths).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }
      toast.error("ブースの追加に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data) => {
      const queries = queryClient.getQueriesData<BoothsQueryData>({
        queryKey: ["booths"],
      });
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<BoothsQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<BoothsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((booth) =>
              booth.boothId === tempIdRef ? data.data : booth
            ),
          });
        }
      });
      toast.success("ブースを追加しました", {
        description: data.message,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["booths"],
        refetchType: "none",
      });
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
      await queryClient.cancelQueries({ queryKey: ["booths"] });
      await queryClient.cancelQueries({
        queryKey: ["booth", updatedBooth.boothId],
      });
      const queries = queryClient.getQueriesData<BoothsQueryData>({
        queryKey: ["booths"],
      });
      const previousBooths: Record<string, BoothsQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousBooths[JSON.stringify(queryKey)] = data;
        }
      });
      const previousBooth = queryClient.getQueryData<Booth>([
        "booth",
        updatedBooth.boothId,
      ]);
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<BoothsQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<BoothsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((booth) =>
              booth.boothId === updatedBooth.boothId
                ? { ...booth, ...updatedBooth, updatedAt: new Date() }
                : booth
            ),
          });
        }
      });
      if (previousBooth) {
        queryClient.setQueryData<Booth>(["booth", updatedBooth.boothId], {
          ...previousBooth,
          ...updatedBooth,
          updatedAt: new Date(),
        });
      }
      return { previousBooths, previousBooth };
    },
    onError: (error, variables, context) => {
      if (context?.previousBooths) {
        Object.entries(context.previousBooths).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
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
      toast.success("ブースを更新しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["booths"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["booth", variables.boothId],
        refetchType: "none",
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

      // Snapshot all booth queries
      const queries = queryClient.getQueriesData<BoothsQueryData>({
        queryKey: ["booths"],
      });
      const previousBooths: Record<string, BoothsQueryData> = {};

      // Save all booth queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousBooths[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the booth being deleted
      let deletedBooth: Booth | undefined;
      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find((booth) => booth.boothId === boothId);
          if (found) {
            deletedBooth = found;
            break;
          }
        }
      }

      // Optimistically update all booth queries
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<BoothsQueryData>(queryKey);

        if (currentData) {
          queryClient.setQueryData<BoothsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.filter((booth) => booth.boothId !== boothId),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // Remove the individual booth query
      queryClient.removeQueries({ queryKey: ["booth", boothId] });

      // Return the snapshots for rollback
      return { previousBooths, deletedBooth };
    },
    onError: (error, boothId, context) => {
      // Rollback booth list queries
      if (context?.previousBooths) {
        Object.entries(context.previousBooths).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore individual booth query if it existed
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
      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["booths"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["booth", boothId],
        refetchType: "none",
      });
    },
  });
}
