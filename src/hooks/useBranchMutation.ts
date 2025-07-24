// src/hooks/useBranchMutation.ts
import { fetcher, CustomError } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BranchCreate, BranchUpdate, BranchOrderUpdate } from "@/schemas/branch.schema";
import { Branch } from "@/hooks/useBranchQuery";

// Helper function to extract error message from CustomError or regular Error
const getErrorMessage = (error: Error): string => {
  if (error instanceof CustomError) {
    return (error.info.error as string) || error.message;
  }
  return error.message;
};

type BranchesResponse = {
  data: Branch[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type BranchMutationContext = {
  previousBranches?: Record<string, BranchesResponse>;
  previousBranch?: Branch;
  deletedBranch?: Branch;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedBranchId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useBranchCreate() {
  const queryClient = useQueryClient();
  return useMutation<
  BranchesResponse,
    Error,
    BranchCreate,
    BranchMutationContext >
      ({
        mutationFn: (data) =>
          fetcher("/api/branches", {
            method: "POST",
            body: JSON.stringify(data),
          }),
        onMutate: async (newBranch) => {
          await queryClient.cancelQueries({ queryKey: ["branches"] });
          const queries = queryClient.getQueriesData<BranchesResponse>({
            queryKey: ["branches"],
          });
          const previousBranches: Record<string, BranchesResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousBranches[JSON.stringify(queryKey)] = data;
            }
          });
          const tempId = `temp-${Date.now()}`;
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<BranchesResponse>(queryKey);
            if (currentData) {
              // Create optimistic branch
              const optimisticBranch: Branch = {
                branchId: tempId,
                name: newBranch.name,
                notes: newBranch.notes || null,
                order: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                _optimistic: true, // Flag to identify optimistic entries
              } as Branch & { _optimistic?: boolean };

              queryClient.setQueryData<BranchesResponse>(queryKey, {
                ...currentData,
                data: [optimisticBranch, ...currentData.data],
                pagination: {
                  ...currentData.pagination,
                  total: currentData.pagination.total + 1,
                },
              });
            }
          });
          return { previousBranches, tempId };
        },
        onError: (error, _, context) => {
          if (context?.previousBranches) {
            Object.entries(context.previousBranches).forEach(
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

          toast.error("校舎の追加に失敗しました", {
            id: "branch-create-error",
            description: getErrorMessage(error),
          });
        },
        onSuccess: (response, _, context) => {
          if (!context?.tempId) return;

          // Store the mapping between temporary ID and server ID
          const newBranch = response.data[0];
          tempToServerIdMap.set(context.tempId, newBranch.branchId);

          // Update all branch queries
          const queries = queryClient.getQueriesData<BranchesResponse>({
            queryKey: ["branches"],
          });

          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<BranchesResponse>(queryKey);
            if (currentData?.data) {
              queryClient.setQueryData<BranchesResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((branch) =>
                  branch.branchId === context.tempId ? newBranch : branch
                ),
              });
            }
          });

          toast.success("校舎を追加しました", {
            id: "branch-create-success",
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["branches"],
            refetchType: "none",
          });
        },
      });
}

export function useBranchUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
  BranchesResponse,
    Error,
    BranchUpdate,
    BranchMutationContext >
      ({
        mutationFn: ({ branchId, ...data }) => {
          // Resolve the ID before sending to the server
          const resolvedId = getResolvedBranchId(branchId);

          return fetcher(`/api/branches/${resolvedId}`, {
            method: "PATCH",
            body: JSON.stringify(data),
          });
        },
        onMutate: async (updatedBranch) => {
          await queryClient.cancelQueries({ queryKey: ["branches"] });

          // Resolve ID for any potential temporary ID
          const resolvedId = getResolvedBranchId(updatedBranch.branchId);

          await queryClient.cancelQueries({
            queryKey: ["branch", resolvedId],
          });
          const queries = queryClient.getQueriesData<BranchesResponse>({
            queryKey: ["branches"],
          });
          const previousBranches: Record<string, BranchesResponse> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousBranches[JSON.stringify(queryKey)] = data;
            }
          });
          const previousBranch = queryClient.getQueryData<Branch>([
            "branch",
            resolvedId,
          ]);
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<BranchesResponse>(queryKey);
            if (currentData?.data) {
              queryClient.setQueryData<BranchesResponse>(queryKey, {
                ...currentData,
                data: currentData.data.map((branch) =>
                  branch.branchId === updatedBranch.branchId
                    ? {
                        ...branch,
                        ...updatedBranch,
                        name: updatedBranch.name || branch.name,
                        updatedAt: new Date(),
                      }
                    : branch
                ),
              });
            }
          });
          if (previousBranch) {
            queryClient.setQueryData<Branch>(["branch", resolvedId], {
              ...previousBranch,
              ...updatedBranch,
              name: updatedBranch.name || previousBranch.name,
              updatedAt: new Date(),
            });
          }
          return { previousBranches, previousBranch };
        },
        onError: (error, variables, context) => {
          if (context?.previousBranches) {
            Object.entries(context.previousBranches).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          // Resolve the ID for restoring the single branch query
          const resolvedId = getResolvedBranchId(variables.branchId);

          if (context?.previousBranch) {
            queryClient.setQueryData(
              ["branch", resolvedId],
              context.previousBranch
            );
          }
          toast.error("校舎の更新に失敗しました", {
            id: "branch-update-error",
            description: getErrorMessage(error),
          });
        },
        onSuccess: (data) => {
          toast.success("校舎を更新しました", {
            id: "branch-update-success",
          });
        },
        onSettled: (_, __, variables) => {
          // Resolve ID for proper invalidation
          const resolvedId = getResolvedBranchId(variables.branchId);

          queryClient.invalidateQueries({
            queryKey: ["branches"],
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: ["branch", resolvedId],
            refetchType: "none",
          });
        },
      });
}

export function useBranchDelete() {
  const queryClient = useQueryClient();
  return useMutation<BranchesResponse, Error, string, BranchMutationContext>({
    mutationFn: (branchId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedBranchId(branchId);

      return fetcher(`/api/branches/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (branchId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["branches"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedBranchId(branchId);

      await queryClient.cancelQueries({ queryKey: ["branch", resolvedId] });

      // Snapshot all branch queries
      const queries = queryClient.getQueriesData<BranchesResponse>({
        queryKey: ["branches"],
      });
      const previousBranches: Record<string, BranchesResponse> = {};

      // Save all branch queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousBranches[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the branch being deleted
      let deletedBranch: Branch | undefined;
      for (const [, data] of queries) {
        if (data?.data) {
          const found = data.data.find(
            (branch) => branch.branchId === branchId
          );
          if (found) {
            deletedBranch = found;
            break;
          }
        }
      }

      // Optimistically update all branch queries
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<BranchesResponse>(queryKey);

        if (currentData?.data) {
          queryClient.setQueryData<BranchesResponse>(queryKey, {
            ...currentData,
            data: currentData.data.filter(
              (branch) => branch.branchId !== branchId
            ),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // Remove the individual branch query
      queryClient.removeQueries({ queryKey: ["branch", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (branchId.startsWith("temp-")) {
        tempToServerIdMap.delete(branchId);
      }

      // Return the snapshots for rollback
      return { previousBranches, deletedBranch };
    },
    onError: (error, branchId, context) => {
      // Rollback branch list queries
      if (context?.previousBranches) {
        Object.entries(context.previousBranches).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (branchId.startsWith("temp-") && context?.deletedBranch) {
        tempToServerIdMap.set(branchId, context.deletedBranch.branchId);
      }

      // Resolve ID for restoring the single branch query
      const resolvedId = getResolvedBranchId(branchId);

      // Restore individual branch query if it existed
      if (context?.deletedBranch) {
        queryClient.setQueryData(["branch", resolvedId], context.deletedBranch);
      }

      toast.error("校舎の削除に失敗しました", {
        id: "branch-delete-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (data, branchId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (branchId.startsWith("temp-")) {
        tempToServerIdMap.delete(branchId);
      }

      toast.success("校舎を削除しました", {
        id: "branch-delete-success",
      });
    },
    onSettled: (_, __, branchId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedBranchId(branchId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["branches"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["branch", resolvedId],
        refetchType: "none",
      });
    },
  });
}

export function useBranchOrderUpdate() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    Error,
    BranchOrderUpdate,
    BranchMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/branches/order", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onMutate: async ({ branchIds }) => {
      await queryClient.cancelQueries({ queryKey: ["branches"] });

      const queries = queryClient.getQueriesData<BranchesResponse>({
        queryKey: ["branches"],
      });

      const previousBranches: Record<string, BranchesResponse> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousBranches[JSON.stringify(queryKey)] = data;
        }
      });

      // Optimistically update the order
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<BranchesResponse>(queryKey);
        if (currentData?.data) {
          const updatedData = {
            ...currentData,
            data: currentData.data.map((branch) => {
              const newOrder = branchIds.indexOf(branch.branchId);
              return newOrder !== -1
                ? { ...branch, order: newOrder + 1 }
                : branch;
            }),
          };

          // Re-sort the data based on the query parameters
          const queryKeyArray = queryKey as any[];
          const sortBy = queryKeyArray[4] || 'order';
          const sortOrder = queryKeyArray[5] || 'asc';

          if (sortBy === 'order') {
            updatedData.data.sort((a, b) => {
              const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
              const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
              return sortOrder === 'asc' ? aOrder - bOrder : bOrder - aOrder;
            });
          }

          queryClient.setQueryData<BranchesResponse>(queryKey, updatedData);
        }
      });

      return { previousBranches };
    },
    onError: (error, _, context) => {
      if (context?.previousBranches) {
        Object.entries(context.previousBranches).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      toast.error("校舎の順序更新に失敗しました", {
        id: "branch-order-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("校舎の順序を更新しました", {
        id: "branch-order-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["branches"],
        refetchType: "none",
      });
    },
  });
}
