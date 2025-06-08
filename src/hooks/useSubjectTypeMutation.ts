// src/hooks/useSubjectTypeMutation.ts
import { fetcher, CustomError } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SubjectTypeCreate,
  SubjectTypeOrderUpdate,
  SubjectTypeUpdate,
} from "@/schemas/subject-type.schema";
import { SubjectType } from "@/hooks/useSubjectTypeQuery";

// Helper function to extract error message from CustomError or regular Error
const getErrorMessage = (error: Error): string => {
  if (error instanceof CustomError) {
    return (error.info.error as string) || error.message;
  }
  return error.message;
};

type SubjectTypesResponse = {
  data: SubjectType[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SubjectTypeMutationContext = {
  previousSubjectTypes?: Record<string, SubjectTypesResponse>;
  previousSubjectType?: SubjectType;
  deletedSubjectType?: SubjectType;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedSubjectTypeId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useSubjectTypeCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    SubjectTypesResponse,
    Error,
    SubjectTypeCreate,
    SubjectTypeMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/subject-types", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newSubjectType) => {
      await queryClient.cancelQueries({ queryKey: ["subjectTypes"] });
      const queries = queryClient.getQueriesData<SubjectTypesResponse>({
        queryKey: ["subjectTypes"],
      });
      const previousSubjectTypes: Record<string, SubjectTypesResponse> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjectTypes[JSON.stringify(queryKey)] = data;
        }
      });
      const tempId = `temp-${Date.now()}`;
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectTypesResponse>(queryKey);
        if (currentData && Array.isArray(currentData.data)) {
          // Create optimistic subject type
          const optimisticSubjectType: SubjectType = {
            subjectTypeId: tempId,
            name: newSubjectType.name,
            notes: newSubjectType.notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _optimistic: true, // Flag to identify optimistic entries
          } as SubjectType & { _optimistic?: boolean };

          queryClient.setQueryData<SubjectTypesResponse>(queryKey, {
            ...currentData,
            data: [optimisticSubjectType, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          });
        }
      });
      return { previousSubjectTypes, tempId };
    },
    onError: (error, _, context) => {
      if (context?.previousSubjectTypes) {
        Object.entries(context.previousSubjectTypes).forEach(
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

      toast.error("科目タイプの追加に失敗しました", {
        id: "subject-type-create-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (response, _, context) => {
      if (!context?.tempId) return;

      // Store the mapping between temporary ID and server ID
      const newSubjectType = response.data[0];
      tempToServerIdMap.set(context.tempId, newSubjectType.subjectTypeId);

      // Update all subject type queries
      const queries = queryClient.getQueriesData<SubjectTypesResponse>({
        queryKey: ["subjectTypes"],
      });

      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectTypesResponse>(queryKey);
        if (currentData && Array.isArray(currentData.data)) {
          queryClient.setQueryData<SubjectTypesResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((subjectType) =>
              subjectType.subjectTypeId === context.tempId
                ? newSubjectType
                : subjectType
            ),
          });
        }
      });

      toast.success("科目タイプを追加しました", {
        id: "subject-type-create-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["subjectTypes"],
        refetchType: "none",
      });
    },
  });
}

export function useSubjectTypeUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    SubjectTypesResponse,
    Error,
    SubjectTypeUpdate,
    SubjectTypeMutationContext
  >({
    mutationFn: ({ subjectTypeId, ...data }) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);

      return fetcher(`/api/subject-types/${resolvedId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onMutate: async (updatedSubjectType) => {
      await queryClient.cancelQueries({ queryKey: ["subjectTypes"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedSubjectTypeId(
        updatedSubjectType.subjectTypeId
      );

      await queryClient.cancelQueries({
        queryKey: ["subjectType", resolvedId],
      });
      const queries = queryClient.getQueriesData<SubjectTypesResponse>({
        queryKey: ["subjectTypes"],
      });
      const previousSubjectTypes: Record<string, SubjectTypesResponse> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjectTypes[JSON.stringify(queryKey)] = data;
        }
      });
      const previousSubjectType = queryClient.getQueryData<SubjectType>([
        "subjectType",
        resolvedId,
      ]);
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectTypesResponse>(queryKey);
        if (currentData && Array.isArray(currentData.data)) {
          queryClient.setQueryData<SubjectTypesResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((subjectType) =>
              subjectType.subjectTypeId === updatedSubjectType.subjectTypeId
                ? {
                    ...subjectType,
                    ...updatedSubjectType,
                    name: updatedSubjectType.name || subjectType.name,
                    updatedAt: new Date(),
                  }
                : subjectType
            ),
          });
        }
      });
      if (previousSubjectType) {
        queryClient.setQueryData<SubjectType>(["subjectType", resolvedId], {
          ...previousSubjectType,
          ...updatedSubjectType,
          name: updatedSubjectType.name || previousSubjectType.name,
          updatedAt: new Date(),
        });
      }
      return { previousSubjectTypes, previousSubjectType };
    },
    onError: (error, variables, context) => {
      if (context?.previousSubjectTypes) {
        Object.entries(context.previousSubjectTypes).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Resolve the ID for restoring the single subject type query
      const resolvedId = getResolvedSubjectTypeId(variables.subjectTypeId);

      if (context?.previousSubjectType) {
        queryClient.setQueryData(
          ["subjectType", resolvedId],
          context.previousSubjectType
        );
      }
      toast.error("科目タイプの更新に失敗しました", {
        id: "subject-type-update-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("科目タイプを更新しました", {
        id: "subject-type-update-success",
      });
    },
    onSettled: (_, __, variables) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedSubjectTypeId(variables.subjectTypeId);

      queryClient.invalidateQueries({
        queryKey: ["subjectTypes"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["subjectType", resolvedId],
        refetchType: "none",
      });
    },
  });
}

export function useSubjectTypeDelete() {
  const queryClient = useQueryClient();
  return useMutation<
    SubjectTypesResponse,
    Error,
    string,
    SubjectTypeMutationContext
  >({
    mutationFn: (subjectTypeId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);

      return fetcher(`/api/subject-types/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (subjectTypeId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["subjectTypes"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);

      await queryClient.cancelQueries({
        queryKey: ["subjectType", resolvedId],
      });

      // Snapshot all subject type queries
      const queries = queryClient.getQueriesData<SubjectTypesResponse>({
        queryKey: ["subjectTypes"],
      });
      const previousSubjectTypes: Record<string, SubjectTypesResponse> = {};

      // Save all subject type queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjectTypes[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the subject type being deleted
      let deletedSubjectType: SubjectType | undefined;
      for (const [, data] of queries) {
        if (data && Array.isArray(data.data)) {
          const found = data.data.find(
            (subjectType) => subjectType.subjectTypeId === subjectTypeId
          );
          if (found) {
            deletedSubjectType = found;
            break;
          }
        }
      }

      // Optimistically update all subject type queries
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectTypesResponse>(queryKey);

        if (currentData && Array.isArray(currentData.data)) {
          queryClient.setQueryData<SubjectTypesResponse>(queryKey, {
            ...currentData,
            data: currentData.data.filter(
              (subjectType) => subjectType.subjectTypeId !== subjectTypeId
            ),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // Remove the individual subject type query
      queryClient.removeQueries({ queryKey: ["subjectType", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (subjectTypeId.startsWith("temp-")) {
        tempToServerIdMap.delete(subjectTypeId);
      }

      // Return the snapshots for rollback
      return { previousSubjectTypes, deletedSubjectType };
    },
    onError: (error, subjectTypeId, context) => {
      // Rollback subject type list queries
      if (context?.previousSubjectTypes) {
        Object.entries(context.previousSubjectTypes).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (subjectTypeId.startsWith("temp-") && context?.deletedSubjectType) {
        tempToServerIdMap.set(
          subjectTypeId,
          context.deletedSubjectType.subjectTypeId
        );
      }

      // Resolve ID for restoring the single subject type query
      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);

      // Restore individual subject type query if it existed
      if (context?.deletedSubjectType) {
        queryClient.setQueryData(
          ["subjectType", resolvedId],
          context.deletedSubjectType
        );
      }

      toast.error("科目タイプの削除に失敗しました", {
        id: "subject-type-delete-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (data, subjectTypeId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (subjectTypeId.startsWith("temp-")) {
        tempToServerIdMap.delete(subjectTypeId);
      }

      toast.success("科目タイプを削除しました", {
        id: "subject-type-delete-success",
      });
    },
    onSettled: (_, __, subjectTypeId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["subjectTypes"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["subjectType", resolvedId],
        refetchType: "none",
      });
    },
  });
}

export function useSubjectTypeOrderUpdate() {
  const queryClient = useQueryClient();

  return useMutation<
    { message: string },
    Error,
    SubjectTypeOrderUpdate,
    SubjectTypeMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/subject-types/order", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onMutate: async ({ subjectTypeIds }) => {
      await queryClient.cancelQueries({ queryKey: ["subjectTypes"] });

      const queries = queryClient.getQueriesData<SubjectTypesResponse>({
        queryKey: ["subjectTypes"],
      });

      const previousSubjectTypes: Record<string, SubjectTypesResponse> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjectTypes[JSON.stringify(queryKey)] = data;
        }
      });

      // Optimistically update the order
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectTypesResponse>(queryKey);
        if (currentData) {
          const updatedData = {
            ...currentData,
            data: currentData.data.map((subjectType) => {
              const newOrder = subjectTypeIds.indexOf(
                subjectType.subjectTypeId
              );
              return newOrder !== -1
                ? { ...subjectType, order: newOrder + 1 }
                : subjectType;
            }),
          };

          // Re-sort the data based on the query parameters
          const queryKeyArray = queryKey as any[];
          const sortBy = queryKeyArray[4] || "order";
          const sortOrder = queryKeyArray[5] || "asc";

          if (sortBy === "order") {
            updatedData.data.sort((a, b) => {
              const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
              const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
              return sortOrder === "asc" ? aOrder - bOrder : bOrder - aOrder;
            });
          }

          queryClient.setQueryData<SubjectTypesResponse>(queryKey, updatedData);
        }
      });

      return { previousSubjectTypes };
    },
    onError: (error, _, context) => {
      if (context?.previousSubjectTypes) {
        Object.entries(context.previousSubjectTypes).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      toast.error("科目タイプの順序更新に失敗しました", {
        id: "subject-type-order-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("科目タイプの順序を更新しました", {
        id: "subject-type-order-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["subjectTypes"],
        refetchType: "none",
      });
    },
  });
}
