// src/hooks/useSubjectTypeMutation.ts
import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SubjectTypeCreate,
  SubjectTypeUpdate,
} from "@/schemas/subject-type.schema";
import { SubjectType } from "./useSubjectTypeQuery";

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
        if (currentData) {
          // Create optimistic subject type
          const optimisticSubjectType: SubjectType = {
            subjectTypeId: tempId,
            name: newSubjectType.name,
            description: newSubjectType.description || null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _optimistic: true,
          };

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
        description: error.message,
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
        if (currentData) {
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
      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);
      return fetcher(`/api/subject-types/${resolvedId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onMutate: async (updatedSubjectType) => {
      await queryClient.cancelQueries({ queryKey: ["subjectTypes"] });

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
        if (currentData) {
          queryClient.setQueryData<SubjectTypesResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((subjectType) =>
              subjectType.subjectTypeId === updatedSubjectType.subjectTypeId
                ? {
                    ...subjectType,
                    ...updatedSubjectType,
                    name: updatedSubjectType.name || subjectType.name,
                    updatedAt: new Date().toISOString(),
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
          updatedAt: new Date().toISOString(),
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

      const resolvedId = getResolvedSubjectTypeId(variables.subjectTypeId);

      if (context?.previousSubjectType) {
        queryClient.setQueryData(
          ["subjectType", resolvedId],
          context.previousSubjectType
        );
      }
      toast.error("科目タイプの更新に失敗しました", {
        id: "subject-type-update-error",
        description: error.message,
      });
    },
    onSuccess: (data) => {
      // Find the updated subject type from the response
      const updatedSubjectType = data?.data?.[0];
      if (updatedSubjectType) {
        // Update all subject type queries to replace the subject type with the updated one
        const queries = queryClient.getQueriesData<SubjectTypesResponse>({
          queryKey: ["subjectTypes"],
        });
        queries.forEach(([queryKey]) => {
          const currentData =
            queryClient.getQueryData<SubjectTypesResponse>(queryKey);
          if (currentData) {
            queryClient.setQueryData<SubjectTypesResponse>(queryKey, {
              ...currentData,
              data: currentData.data.map((subjectType) =>
                subjectType.subjectTypeId === updatedSubjectType.subjectTypeId
                  ? updatedSubjectType
                  : subjectType
              ),
            });
          }
        });
        // Also update the single subject type query if it exists
        queryClient.setQueryData(
          ["subjectType", updatedSubjectType.subjectTypeId],
          updatedSubjectType
        );
      }
      toast.success("科目タイプを更新しました", {
        id: "subject-type-update-success",
      });
    },
    onSettled: (_, __, variables) => {
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
      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);
      return fetcher(`/api/subject-types/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (subjectTypeId) => {
      await queryClient.cancelQueries({ queryKey: ["subjectTypes"] });

      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);

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

      let deletedSubjectType: SubjectType | undefined;
      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find(
            (subjectType) => subjectType.subjectTypeId === subjectTypeId
          );
          if (found) {
            deletedSubjectType = found;
            break;
          }
        }
      }

      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectTypesResponse>(queryKey);

        if (currentData) {
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

      queryClient.removeQueries({ queryKey: ["subjectType", resolvedId] });

      if (subjectTypeId.startsWith("temp-")) {
        tempToServerIdMap.delete(subjectTypeId);
      }

      return { previousSubjectTypes, deletedSubjectType };
    },
    onError: (error, subjectTypeId, context) => {
      if (context?.previousSubjectTypes) {
        Object.entries(context.previousSubjectTypes).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      if (subjectTypeId.startsWith("temp-") && context?.deletedSubjectType) {
        tempToServerIdMap.set(
          subjectTypeId,
          context.deletedSubjectType.subjectTypeId
        );
      }

      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);

      if (context?.deletedSubjectType) {
        queryClient.setQueryData(
          ["subjectType", resolvedId],
          context.deletedSubjectType
        );
      }

      toast.error("科目タイプの削除に失敗しました", {
        id: "subject-type-delete-error",
        description: error.message,
      });
    },
    onSuccess: (data, subjectTypeId) => {
      if (subjectTypeId.startsWith("temp-")) {
        tempToServerIdMap.delete(subjectTypeId);
      }

      toast.success("科目タイプを削除しました", {
        id: "subject-type-delete-success",
      });
    },
    onSettled: (_, __, subjectTypeId) => {
      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);

      queryClient.invalidateQueries({
        queryKey: ["subjectTypes"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["subjectType", resolvedId],
        refetchType: "none",
      });

      // Invalidate subject offerings since they depend on subject types
      queryClient.invalidateQueries({
        queryKey: ["subjectOfferings"],
        refetchType: "none",
      });
    },
  });
}
