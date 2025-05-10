import { fetcher } from "@/lib/fetcher";
import {
  CreateSubjectTypeInput,
  UpdateSubjectTypeInput,
} from "@/schemas/subject-type.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { SubjectType } from "@prisma/client";
import { toast } from "sonner";

type CreateSubjectTypeResponse = {
  message: string;
  data: SubjectType;
};

type UpdateSubjectTypeResponse = {
  message: string;
  data: SubjectType;
};

type DeleteSubjectTypeResponse = {
  message: string;
};

type SubjectTypesQueryData = {
  data: SubjectType[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Define context types for mutations
type SubjectTypeMutationContext = {
  previousSubjectTypes?: Record<string, SubjectTypesQueryData>;
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
    CreateSubjectTypeResponse,
    Error,
    CreateSubjectTypeInput,
    SubjectTypeMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/subject-type", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newSubjectType) => {
      await queryClient.cancelQueries({ queryKey: ["subjectType"] });
      const queries = queryClient.getQueriesData<SubjectTypesQueryData>({
        queryKey: ["subjectType"],
      });
      const previousSubjectTypes: Record<string, SubjectTypesQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjectTypes[JSON.stringify(queryKey)] = data;
        }
      });
      const tempId = `temp-${Date.now()}`;
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectTypesQueryData>(queryKey);
        if (currentData) {
          // For optimistic updates, create a temporary subject type with _optimistic flag
          const optimisticSubjectType = {
            ...newSubjectType,
            subjectTypeId: tempId,
            _optimistic: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          } as SubjectType & { _optimistic?: boolean };

          queryClient.setQueryData<SubjectTypesQueryData>(queryKey, {
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
        description: error.message,
      });
    },
    onSuccess: (response, _, context) => {
      if (!context?.tempId) return;

      // Store the mapping between temporary ID and server ID
      tempToServerIdMap.set(context.tempId, response.data.subjectTypeId);

      // Update all subject type queries
      const queries = queryClient.getQueriesData<SubjectTypesQueryData>({
        queryKey: ["subjectType"],
      });
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectTypesQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<SubjectTypesQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((subjectType) =>
              subjectType.subjectTypeId === context.tempId
                ? response.data
                : subjectType
            ),
          });
        }
      });

      toast.success("科目タイプを追加しました", {
        description: response.message,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["subjectType"],
        refetchType: "none",
      });
    },
  });
}

export function useSubjectTypeUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateSubjectTypeResponse,
    Error,
    UpdateSubjectTypeInput,
    SubjectTypeMutationContext
  >({
    mutationFn: ({ subjectTypeId, ...data }) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);

      return fetcher(`/api/subject-type`, {
        method: "PUT",
        body: JSON.stringify({ subjectTypeId: resolvedId, ...data }),
      });
    },
    onMutate: async (updatedSubjectType) => {
      await queryClient.cancelQueries({ queryKey: ["subjectType"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedSubjectTypeId(
        updatedSubjectType.subjectTypeId
      );

      await queryClient.cancelQueries({
        queryKey: ["subjectType", resolvedId],
      });
      const queries = queryClient.getQueriesData<SubjectTypesQueryData>({
        queryKey: ["subjectType"],
      });
      const previousSubjectTypes: Record<string, SubjectTypesQueryData> = {};
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
          queryClient.getQueryData<SubjectTypesQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<SubjectTypesQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((subjectType) =>
              subjectType.subjectTypeId === updatedSubjectType.subjectTypeId
                ? {
                    ...subjectType,
                    ...updatedSubjectType,
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
        description: error.message,
      });
    },
    onSuccess: (data) => {
      toast.success("科目タイプを更新しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, variables) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedSubjectTypeId(variables.subjectTypeId);

      queryClient.invalidateQueries({
        queryKey: ["subjectType"],
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
    DeleteSubjectTypeResponse,
    Error,
    string,
    SubjectTypeMutationContext
  >({
    mutationFn: (subjectTypeId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);

      return fetcher(`/api/subject-type?subjectTypeId=${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (subjectTypeId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["subjectType"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);

      await queryClient.cancelQueries({
        queryKey: ["subjectType", resolvedId],
      });

      // Snapshot all subject type queries
      const queries = queryClient.getQueriesData<SubjectTypesQueryData>({
        queryKey: ["subjectType"],
      });
      const previousSubjectTypes: Record<string, SubjectTypesQueryData> = {};

      // Save all subject type queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjectTypes[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the subject type being deleted
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

      // Optimistically update all subject type queries
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectTypesQueryData>(queryKey);

        if (currentData) {
          queryClient.setQueryData<SubjectTypesQueryData>(queryKey, {
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
        description: error.message,
      });
    },
    onSuccess: (data, subjectTypeId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (subjectTypeId.startsWith("temp-")) {
        tempToServerIdMap.delete(subjectTypeId);
      }

      toast.success("科目タイプを削除しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, subjectTypeId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedSubjectTypeId(subjectTypeId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["subjectType"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["subjectType", resolvedId],
        refetchType: "none",
      });
    },
  });
}
