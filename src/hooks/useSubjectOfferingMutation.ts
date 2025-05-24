// src/hooks/useSubjectOfferingMutation.ts
import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  SubjectOfferingCreate,
  SubjectOfferingUpdate,
  SubjectOfferingBulkCreate,
} from "@/schemas/subject-offering.schema";
import { SubjectOffering } from "./useSubjectOfferingQuery";

type SubjectOfferingsResponse = {
  data: SubjectOffering[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SubjectOfferingMutationContext = {
  previousSubjectOfferings?: Record<string, SubjectOfferingsResponse>;
  previousSubjectOffering?: SubjectOffering;
  deletedSubjectOffering?: SubjectOffering;
  tempIds?: string[];
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedSubjectOfferingId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useSubjectOfferingCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    SubjectOfferingsResponse,
    Error,
    SubjectOfferingCreate,
    SubjectOfferingMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/subject-offerings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newSubjectOffering) => {
      await queryClient.cancelQueries({ queryKey: ["subjectOfferings"] });
      const queries = queryClient.getQueriesData<SubjectOfferingsResponse>({
        queryKey: ["subjectOfferings"],
      });
      const previousSubjectOfferings: Record<string, SubjectOfferingsResponse> =
        {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjectOfferings[JSON.stringify(queryKey)] = data;
        }
      });

      const tempId = `temp-${Date.now()}`;
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectOfferingsResponse>(queryKey);
        if (currentData) {
          // Create optimistic subject offering
          const optimisticSubjectOffering: SubjectOffering = {
            subjectOfferingId: tempId,
            subjectId: newSubjectOffering.subjectId,
            subjectName: "", // We don't know the subject name optimistically
            subjectTypeId: newSubjectOffering.subjectTypeId,
            subjectTypeName: "", // We don't know the subject type name optimistically
            offeringCode: newSubjectOffering.offeringCode || null,
            isActive: newSubjectOffering.isActive ?? true,
            notes: newSubjectOffering.notes || null,
            branchId: null, // We don't know the branch optimistically
            branchName: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _count: {
              teacherQualifications: 0,
              studentSubjectPreferences: 0,
            },
            _optimistic: true,
          };

          queryClient.setQueryData<SubjectOfferingsResponse>(queryKey, {
            ...currentData,
            data: [optimisticSubjectOffering, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          });
        }
      });
      return { previousSubjectOfferings, tempIds: [tempId] };
    },
    onError: (error, _, context) => {
      if (context?.previousSubjectOfferings) {
        Object.entries(context.previousSubjectOfferings).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Clean up the ID mappings if we created any
      if (context?.tempIds) {
        context.tempIds.forEach((tempId) => tempToServerIdMap.delete(tempId));
      }

      toast.error("科目提供の追加に失敗しました", {
        id: "subject-offering-create-error",
        description: error.message,
      });
    },
    onSuccess: (response, _, context) => {
      if (
        !context?.tempIds ||
        context.tempIds.length === 0 ||
        response.data.length === 0
      )
        return;

      // Store the mapping between temporary ID and server ID
      const newSubjectOffering = response.data[0];
      tempToServerIdMap.set(
        context.tempIds[0],
        newSubjectOffering.subjectOfferingId
      );

      // Update all subject offering queries
      const queries = queryClient.getQueriesData<SubjectOfferingsResponse>({
        queryKey: ["subjectOfferings"],
      });

      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectOfferingsResponse>(queryKey);
        if (currentData) {
          queryClient.setQueryData<SubjectOfferingsResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((subjectOffering) =>
              subjectOffering.subjectOfferingId === context.tempIds![0]
                ? newSubjectOffering
                : subjectOffering
            ),
          });
        }
      });

      toast.success("科目提供を追加しました", {
        id: "subject-offering-create-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["subjectOfferings"],
        refetchType: "none",
      });
    },
  });
}

export function useSubjectOfferingBulkCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    SubjectOfferingsResponse,
    Error,
    SubjectOfferingBulkCreate,
    SubjectOfferingMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/subject-offerings", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (bulkData) => {
      await queryClient.cancelQueries({ queryKey: ["subjectOfferings"] });
      const queries = queryClient.getQueriesData<SubjectOfferingsResponse>({
        queryKey: ["subjectOfferings"],
      });
      const previousSubjectOfferings: Record<string, SubjectOfferingsResponse> =
        {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjectOfferings[JSON.stringify(queryKey)] = data;
        }
      });

      // We don't do optimistic updates for bulk operations since they're more complex
      return { previousSubjectOfferings };
    },
    onError: (error, _, context) => {
      if (context?.previousSubjectOfferings) {
        Object.entries(context.previousSubjectOfferings).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      toast.error("科目提供の一括追加に失敗しました", {
        id: "subject-offering-bulk-create-error",
        description: error.message,
      });
    },
    onSuccess: (response) => {
      toast.success(`${response.data.length}件の科目提供を追加しました`, {
        id: "subject-offering-bulk-create-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["subjectOfferings"],
        refetchType: "none",
      });
    },
  });
}

export function useSubjectOfferingUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    SubjectOfferingsResponse,
    Error,
    SubjectOfferingUpdate,
    SubjectOfferingMutationContext
  >({
    mutationFn: ({ subjectOfferingId, ...data }) => {
      const resolvedId = getResolvedSubjectOfferingId(subjectOfferingId);
      return fetcher(`/api/subject-offerings/${resolvedId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onMutate: async (updatedSubjectOffering) => {
      await queryClient.cancelQueries({ queryKey: ["subjectOfferings"] });

      const resolvedId = getResolvedSubjectOfferingId(
        updatedSubjectOffering.subjectOfferingId
      );

      await queryClient.cancelQueries({
        queryKey: ["subjectOffering", resolvedId],
      });
      const queries = queryClient.getQueriesData<SubjectOfferingsResponse>({
        queryKey: ["subjectOfferings"],
      });
      const previousSubjectOfferings: Record<string, SubjectOfferingsResponse> =
        {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjectOfferings[JSON.stringify(queryKey)] = data;
        }
      });
      const previousSubjectOffering = queryClient.getQueryData<SubjectOffering>(
        ["subjectOffering", resolvedId]
      );
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectOfferingsResponse>(queryKey);
        if (currentData) {
          queryClient.setQueryData<SubjectOfferingsResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((subjectOffering) =>
              subjectOffering.subjectOfferingId ===
              updatedSubjectOffering.subjectOfferingId
                ? {
                    ...subjectOffering,
                    ...updatedSubjectOffering,
                    updatedAt: new Date().toISOString(),
                  }
                : subjectOffering
            ),
          });
        }
      });
      if (previousSubjectOffering) {
        queryClient.setQueryData<SubjectOffering>(
          ["subjectOffering", resolvedId],
          {
            ...previousSubjectOffering,
            ...updatedSubjectOffering,
            updatedAt: new Date().toISOString(),
          }
        );
      }
      return { previousSubjectOfferings, previousSubjectOffering };
    },
    onError: (error, variables, context) => {
      if (context?.previousSubjectOfferings) {
        Object.entries(context.previousSubjectOfferings).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      const resolvedId = getResolvedSubjectOfferingId(
        variables.subjectOfferingId
      );

      if (context?.previousSubjectOffering) {
        queryClient.setQueryData(
          ["subjectOffering", resolvedId],
          context.previousSubjectOffering
        );
      }

      toast.error("科目提供の更新に失敗しました", {
        id: "subject-offering-update-error",
        description: error.message,
      });
    },
    onSuccess: (data) => {
      // Find the updated subject offering from the response
      const updatedSubjectOffering = data?.data?.[0];
      if (updatedSubjectOffering) {
        // Update all subject offering queries
        const queries = queryClient.getQueriesData<SubjectOfferingsResponse>({
          queryKey: ["subjectOfferings"],
        });
        queries.forEach(([queryKey]) => {
          const currentData =
            queryClient.getQueryData<SubjectOfferingsResponse>(queryKey);
          if (currentData) {
            queryClient.setQueryData<SubjectOfferingsResponse>(queryKey, {
              ...currentData,
              data: currentData.data.map((subjectOffering) =>
                subjectOffering.subjectOfferingId ===
                updatedSubjectOffering.subjectOfferingId
                  ? updatedSubjectOffering
                  : subjectOffering
              ),
            });
          }
        });
        // Also update the single subject offering query if it exists
        queryClient.setQueryData(
          ["subjectOffering", updatedSubjectOffering.subjectOfferingId],
          updatedSubjectOffering
        );
      }

      toast.success("科目提供を更新しました", {
        id: "subject-offering-update-success",
      });
    },
    onSettled: (_, __, variables) => {
      const resolvedId = getResolvedSubjectOfferingId(
        variables.subjectOfferingId
      );

      queryClient.invalidateQueries({
        queryKey: ["subjectOfferings"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["subjectOffering", resolvedId],
        refetchType: "none",
      });
    },
  });
}

export function useSubjectOfferingDelete() {
  const queryClient = useQueryClient();
  return useMutation<
    SubjectOfferingsResponse,
    Error,
    string,
    SubjectOfferingMutationContext
  >({
    mutationFn: (subjectOfferingId) => {
      const resolvedId = getResolvedSubjectOfferingId(subjectOfferingId);
      return fetcher(`/api/subject-offerings/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (subjectOfferingId) => {
      await queryClient.cancelQueries({ queryKey: ["subjectOfferings"] });

      const resolvedId = getResolvedSubjectOfferingId(subjectOfferingId);

      await queryClient.cancelQueries({
        queryKey: ["subjectOffering", resolvedId],
      });

      const queries = queryClient.getQueriesData<SubjectOfferingsResponse>({
        queryKey: ["subjectOfferings"],
      });
      const previousSubjectOfferings: Record<string, SubjectOfferingsResponse> =
        {};

      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjectOfferings[JSON.stringify(queryKey)] = data;
        }
      });

      let deletedSubjectOffering: SubjectOffering | undefined;
      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find(
            (subjectOffering) =>
              subjectOffering.subjectOfferingId === subjectOfferingId
          );
          if (found) {
            deletedSubjectOffering = found;
            break;
          }
        }
      }

      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectOfferingsResponse>(queryKey);

        if (currentData) {
          queryClient.setQueryData<SubjectOfferingsResponse>(queryKey, {
            ...currentData,
            data: currentData.data.filter(
              (subjectOffering) =>
                subjectOffering.subjectOfferingId !== subjectOfferingId
            ),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      queryClient.removeQueries({ queryKey: ["subjectOffering", resolvedId] });

      if (subjectOfferingId.startsWith("temp-")) {
        tempToServerIdMap.delete(subjectOfferingId);
      }

      return { previousSubjectOfferings, deletedSubjectOffering };
    },
    onError: (error, subjectOfferingId, context) => {
      if (context?.previousSubjectOfferings) {
        Object.entries(context.previousSubjectOfferings).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      if (
        subjectOfferingId.startsWith("temp-") &&
        context?.deletedSubjectOffering
      ) {
        tempToServerIdMap.set(
          subjectOfferingId,
          context.deletedSubjectOffering.subjectOfferingId
        );
      }

      const resolvedId = getResolvedSubjectOfferingId(subjectOfferingId);

      if (context?.deletedSubjectOffering) {
        queryClient.setQueryData(
          ["subjectOffering", resolvedId],
          context.deletedSubjectOffering
        );
      }

      toast.error("科目提供の削除に失敗しました", {
        id: "subject-offering-delete-error",
        description: error.message,
      });
    },
    onSuccess: (data, subjectOfferingId) => {
      if (subjectOfferingId.startsWith("temp-")) {
        tempToServerIdMap.delete(subjectOfferingId);
      }

      toast.success("科目提供を削除しました", {
        id: "subject-offering-delete-success",
      });
    },
    onSettled: (_, __, subjectOfferingId) => {
      const resolvedId = getResolvedSubjectOfferingId(subjectOfferingId);

      queryClient.invalidateQueries({
        queryKey: ["subjectOfferings"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["subjectOffering", resolvedId],
        refetchType: "none",
      });

      // Invalidate teacher qualifications and student preferences since they depend on subject offerings
      queryClient.invalidateQueries({
        queryKey: ["teacherQualifications"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["studentSubjectPreferences"],
        refetchType: "none",
      });
    },
  });
}
