import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Booth } from "@prisma/client";
import { toast } from "sonner";
import { BoothCreate, BoothUpdate } from "@/schemas/booth.schema";

type FormattedBooth = {
  boothId: string;
  branchId: string;
  branchName: string;
  name: string;
  status: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CreateBoothResponse = {
  message: string;
  data: FormattedBooth[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type UpdateBoothResponse = {
  message: string;
  data: FormattedBooth[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type DeleteBoothResponse = {
  message: string;
};

type BoothsQueryData = {
  data: FormattedBooth[];
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
  previousBooth?: FormattedBooth;
  deletedBooth?: FormattedBooth;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedBoothId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useBoothCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    CreateBoothResponse,
    Error,
    BoothCreate,
    BoothMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/booths", {
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
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<BoothsQueryData>(queryKey);
        if (currentData) {
          // Create optimistic booth with the proper shape including branch info
          // from localStorage if available
          const branchId = localStorage.getItem("selectedBranchId") || "";
          const branchName = ""; // We can't know the branch name optimistically

          const optimisticBooth: FormattedBooth = {
            boothId: tempId,
            branchId: branchId,
            branchName: branchName,
            name: newBooth.name, // This is crucial - ensure name is included
            status: newBooth.status ?? true,
            notes: newBooth.notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _optimistic: true, // Flag to identify optimistic entries
          } as FormattedBooth & { _optimistic?: boolean };

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

      // Clean up the ID mapping if we created one
      if (context?.tempId) {
        tempToServerIdMap.delete(context.tempId);
      }

      toast.error("ブースの追加に失敗しました", {
        id: "booth-create-error",
        description: error.message,
      });
    },
    onSuccess: (response, _, context) => {
      if (!context?.tempId) return;

      // Store the mapping between temporary ID and server ID
      const newBooth = response.data[0];
      tempToServerIdMap.set(context.tempId, newBooth.boothId);

      // Update all booth queries
      const queries = queryClient.getQueriesData<BoothsQueryData>({
        queryKey: ["booths"],
      });

      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<BoothsQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<BoothsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((booth) =>
              booth.boothId === context.tempId ? newBooth : booth
            ),
          });
        }
      });

      toast.success("ブースを追加しました", {
        id: "booth-create-success",
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
    BoothUpdate,
    BoothMutationContext
  >({
    mutationFn: ({ boothId, ...data }) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedBoothId(boothId);

      return fetcher(`/api/booths/${resolvedId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onMutate: async (updatedBooth) => {
      await queryClient.cancelQueries({ queryKey: ["booths"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedBoothId(updatedBooth.boothId);

      await queryClient.cancelQueries({
        queryKey: ["booth", resolvedId],
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
      const previousBooth = queryClient.getQueryData<FormattedBooth>([
        "booth",
        resolvedId,
      ]);
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<BoothsQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<BoothsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((booth) =>
              booth.boothId === updatedBooth.boothId
                ? {
                    ...booth,
                    ...updatedBooth,
                    updatedAt: new Date(),
                    name: updatedBooth.name || booth.name, // Ensure name is preserved
                  }
                : booth
            ),
          });
        }
      });
      if (previousBooth) {
        queryClient.setQueryData<FormattedBooth>(["booth", resolvedId], {
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

      // Resolve the ID for restoring the single booth query
      const resolvedId = getResolvedBoothId(variables.boothId);

      if (context?.previousBooth) {
        queryClient.setQueryData(["booth", resolvedId], context.previousBooth);
      }
      toast.error("ブースの更新に失敗しました", {
        id: "booth-update-error",
        description: error.message,
      });
    },
    onSuccess: (data) => {
      toast.success("ブースを更新しました", {
        id: "booth-update-success",
      });
    },
    onSettled: (_, __, variables) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedBoothId(variables.boothId);

      queryClient.invalidateQueries({
        queryKey: ["booths"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["booth", resolvedId],
        refetchType: "none",
      });
    },
  });
}

export function useBoothDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteBoothResponse, Error, string, BoothMutationContext>({
    mutationFn: (boothId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedBoothId(boothId);

      return fetcher(`/api/booths/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (boothId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["booths"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedBoothId(boothId);

      await queryClient.cancelQueries({ queryKey: ["booth", resolvedId] });

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
      let deletedBooth: FormattedBooth | undefined;
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
      queryClient.removeQueries({ queryKey: ["booth", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (boothId.startsWith("temp-")) {
        tempToServerIdMap.delete(boothId);
      }

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

      // Restore mapping if it was removed
      if (boothId.startsWith("temp-") && context?.deletedBooth) {
        tempToServerIdMap.set(boothId, context.deletedBooth.boothId);
      }

      // Resolve ID for restoring the single booth query
      const resolvedId = getResolvedBoothId(boothId);

      // Restore individual booth query if it existed
      if (context?.deletedBooth) {
        queryClient.setQueryData(["booth", resolvedId], context.deletedBooth);
      }

      toast.error("ブースの削除に失敗しました", {
        id: "booth-delete-error",
        description: error.message,
      });
    },
    onSuccess: (data, boothId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (boothId.startsWith("temp-")) {
        tempToServerIdMap.delete(boothId);
      }

      toast.success("ブースを削除しました", {
        id: "booth-delete-success",
      });
    },
    onSettled: (_, __, boothId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedBoothId(boothId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["booths"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["booth", resolvedId],
        refetchType: "none",
      });
    },
  });
}
