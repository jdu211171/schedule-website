// src/hooks/useTeacherQualificationMutation.ts
import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  TeacherQualificationCreate,
  TeacherQualificationUpdate,
  TeacherQualificationBulkCreate,
  TeacherQualificationBatchVerify,
} from "@/schemas/teacher-qualification.schema";
import { TeacherQualification } from "./useTeacherQualificationQuery";

type TeacherQualificationsResponse = {
  data: TeacherQualification[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type TeacherQualificationMutationContext = {
  previousQualifications?: Record<string, TeacherQualificationsResponse>;
  previousQualification?: TeacherQualification;
  deletedQualification?: TeacherQualification;
  tempIds?: string[];
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedTeacherQualificationId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useTeacherQualificationCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    TeacherQualificationsResponse,
    Error,
    TeacherQualificationCreate,
    TeacherQualificationMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/teacher-qualifications", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newQualification) => {
      await queryClient.cancelQueries({ queryKey: ["teacherQualifications"] });
      const queries = queryClient.getQueriesData<TeacherQualificationsResponse>(
        {
          queryKey: ["teacherQualifications"],
        }
      );
      const previousQualifications: Record<
        string,
        TeacherQualificationsResponse
      > = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousQualifications[JSON.stringify(queryKey)] = data;
        }
      });

      const tempId = `temp-${Date.now()}`;
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<TeacherQualificationsResponse>(queryKey);
        if (currentData) {
          // Create optimistic qualification
          const optimisticQualification: TeacherQualification = {
            qualificationId: tempId,
            teacherId: newQualification.teacherId,
            teacherName: "", // We don't know the teacher name optimistically
            subjectOfferingId: newQualification.subjectOfferingId,
            subjectName: "", // We don't know these names optimistically
            subjectTypeName: "",
            verified: newQualification.verified ?? true,
            notes: newQualification.notes || null,
            branchId: null,
            branchName: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            _optimistic: true,
          };

          queryClient.setQueryData<TeacherQualificationsResponse>(queryKey, {
            ...currentData,
            data: [optimisticQualification, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          });
        }
      });
      return { previousQualifications, tempIds: [tempId] };
    },
    onError: (error, _, context) => {
      if (context?.previousQualifications) {
        Object.entries(context.previousQualifications).forEach(
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

      toast.error("教師資格の追加に失敗しました", {
        id: "teacher-qualification-create-error",
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
      const newQualification = response.data[0];
      tempToServerIdMap.set(
        context.tempIds[0],
        newQualification.qualificationId
      );

      // Update all qualification queries
      const queries = queryClient.getQueriesData<TeacherQualificationsResponse>(
        {
          queryKey: ["teacherQualifications"],
        }
      );

      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<TeacherQualificationsResponse>(queryKey);
        if (currentData) {
          queryClient.setQueryData<TeacherQualificationsResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((qualification) =>
              qualification.qualificationId === context.tempIds![0]
                ? newQualification
                : qualification
            ),
          });
        }
      });

      toast.success("教師資格を追加しました", {
        id: "teacher-qualification-create-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacherQualifications"],
        refetchType: "none",
      });
    },
  });
}

export function useTeacherQualificationBulkCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    TeacherQualificationsResponse,
    Error,
    TeacherQualificationBulkCreate,
    TeacherQualificationMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/teacher-qualifications", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (bulkData) => {
      await queryClient.cancelQueries({ queryKey: ["teacherQualifications"] });
      const queries = queryClient.getQueriesData<TeacherQualificationsResponse>(
        {
          queryKey: ["teacherQualifications"],
        }
      );
      const previousQualifications: Record<
        string,
        TeacherQualificationsResponse
      > = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousQualifications[JSON.stringify(queryKey)] = data;
        }
      });

      // We don't do optimistic updates for bulk operations since they're more complex
      return { previousQualifications };
    },
    onError: (error, _, context) => {
      if (context?.previousQualifications) {
        Object.entries(context.previousQualifications).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      toast.error("教師資格の一括追加に失敗しました", {
        id: "teacher-qualification-bulk-create-error",
        description: error.message,
      });
    },
    onSuccess: (response) => {
      toast.success(`${response.data.length}件の教師資格を追加しました`, {
        id: "teacher-qualification-bulk-create-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacherQualifications"],
        refetchType: "none",
      });
    },
  });
}

export function useTeacherQualificationBatchVerify() {
  const queryClient = useQueryClient();
  return useMutation<
    TeacherQualificationsResponse,
    Error,
    TeacherQualificationBatchVerify,
    TeacherQualificationMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/teacher-qualifications", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (batchData) => {
      await queryClient.cancelQueries({ queryKey: ["teacherQualifications"] });
      const queries = queryClient.getQueriesData<TeacherQualificationsResponse>(
        {
          queryKey: ["teacherQualifications"],
        }
      );
      const previousQualifications: Record<
        string,
        TeacherQualificationsResponse
      > = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousQualifications[JSON.stringify(queryKey)] = data;
        }
      });

      // Optimistically update verification status
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<TeacherQualificationsResponse>(queryKey);
        if (currentData) {
          queryClient.setQueryData<TeacherQualificationsResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((qualification) =>
              batchData.qualificationIds.includes(qualification.qualificationId)
                ? {
                    ...qualification,
                    verified: batchData.verified,
                    updatedAt: new Date().toISOString(),
                  }
                : qualification
            ),
          });
        }
      });

      return { previousQualifications };
    },
    onError: (error, _, context) => {
      if (context?.previousQualifications) {
        Object.entries(context.previousQualifications).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      toast.error("資格認証の一括更新に失敗しました", {
        id: "teacher-qualification-batch-verify-error",
        description: error.message,
      });
    },
    onSuccess: (response) => {
      toast.success(response.message || "資格認証を更新しました", {
        id: "teacher-qualification-batch-verify-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacherQualifications"],
        refetchType: "none",
      });
    },
  });
}

export function useTeacherQualificationUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    TeacherQualificationsResponse,
    Error,
    TeacherQualificationUpdate,
    TeacherQualificationMutationContext
  >({
    mutationFn: ({ qualificationId, ...data }) => {
      const resolvedId = getResolvedTeacherQualificationId(qualificationId);
      return fetcher(`/api/teacher-qualifications/${resolvedId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onMutate: async (updatedQualification) => {
      await queryClient.cancelQueries({ queryKey: ["teacherQualifications"] });

      const resolvedId = getResolvedTeacherQualificationId(
        updatedQualification.qualificationId
      );

      await queryClient.cancelQueries({
        queryKey: ["teacherQualification", resolvedId],
      });
      const queries = queryClient.getQueriesData<TeacherQualificationsResponse>(
        {
          queryKey: ["teacherQualifications"],
        }
      );
      const previousQualifications: Record<
        string,
        TeacherQualificationsResponse
      > = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousQualifications[JSON.stringify(queryKey)] = data;
        }
      });
      const previousQualification =
        queryClient.getQueryData<TeacherQualification>([
          "teacherQualification",
          resolvedId,
        ]);
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<TeacherQualificationsResponse>(queryKey);
        if (currentData) {
          queryClient.setQueryData<TeacherQualificationsResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((qualification) =>
              qualification.qualificationId ===
              updatedQualification.qualificationId
                ? {
                    ...qualification,
                    ...updatedQualification,
                    updatedAt: new Date().toISOString(),
                  }
                : qualification
            ),
          });
        }
      });
      if (previousQualification) {
        queryClient.setQueryData<TeacherQualification>(
          ["teacherQualification", resolvedId],
          {
            ...previousQualification,
            ...updatedQualification,
            updatedAt: new Date().toISOString(),
          }
        );
      }
      return { previousQualifications, previousQualification };
    },
    onError: (error, variables, context) => {
      if (context?.previousQualifications) {
        Object.entries(context.previousQualifications).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      const resolvedId = getResolvedTeacherQualificationId(
        variables.qualificationId
      );

      if (context?.previousQualification) {
        queryClient.setQueryData(
          ["teacherQualification", resolvedId],
          context.previousQualification
        );
      }

      toast.error("教師資格の更新に失敗しました", {
        id: "teacher-qualification-update-error",
        description: error.message,
      });
    },
    onSuccess: (data) => {
      // Find the updated qualification from the response
      const updatedQualification = data?.data?.[0];
      if (updatedQualification) {
        // Update all qualification queries
        const queries =
          queryClient.getQueriesData<TeacherQualificationsResponse>({
            queryKey: ["teacherQualifications"],
          });
        queries.forEach(([queryKey]) => {
          const currentData =
            queryClient.getQueryData<TeacherQualificationsResponse>(queryKey);
          if (currentData) {
            queryClient.setQueryData<TeacherQualificationsResponse>(queryKey, {
              ...currentData,
              data: currentData.data.map((qualification) =>
                qualification.qualificationId ===
                updatedQualification.qualificationId
                  ? updatedQualification
                  : qualification
              ),
            });
          }
        });
        // Also update the single qualification query if it exists
        queryClient.setQueryData(
          ["teacherQualification", updatedQualification.qualificationId],
          updatedQualification
        );
      }

      toast.success("教師資格を更新しました", {
        id: "teacher-qualification-update-success",
      });
    },
    onSettled: (_, __, variables) => {
      const resolvedId = getResolvedTeacherQualificationId(
        variables.qualificationId
      );

      queryClient.invalidateQueries({
        queryKey: ["teacherQualifications"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["teacherQualification", resolvedId],
        refetchType: "none",
      });
    },
  });
}

export function useTeacherQualificationDelete() {
  const queryClient = useQueryClient();
  return useMutation<
    TeacherQualificationsResponse,
    Error,
    string,
    TeacherQualificationMutationContext
  >({
    mutationFn: (qualificationId) => {
      const resolvedId = getResolvedTeacherQualificationId(qualificationId);
      return fetcher(`/api/teacher-qualifications/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (qualificationId) => {
      await queryClient.cancelQueries({ queryKey: ["teacherQualifications"] });

      const resolvedId = getResolvedTeacherQualificationId(qualificationId);

      await queryClient.cancelQueries({
        queryKey: ["teacherQualification", resolvedId],
      });

      const queries = queryClient.getQueriesData<TeacherQualificationsResponse>(
        {
          queryKey: ["teacherQualifications"],
        }
      );
      const previousQualifications: Record<
        string,
        TeacherQualificationsResponse
      > = {};

      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousQualifications[JSON.stringify(queryKey)] = data;
        }
      });

      let deletedQualification: TeacherQualification | undefined;
      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find(
            (qualification) => qualification.qualificationId === qualificationId
          );
          if (found) {
            deletedQualification = found;
            break;
          }
        }
      }

      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<TeacherQualificationsResponse>(queryKey);

        if (currentData) {
          queryClient.setQueryData<TeacherQualificationsResponse>(queryKey, {
            ...currentData,
            data: currentData.data.filter(
              (qualification) =>
                qualification.qualificationId !== qualificationId
            ),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      queryClient.removeQueries({
        queryKey: ["teacherQualification", resolvedId],
      });

      if (qualificationId.startsWith("temp-")) {
        tempToServerIdMap.delete(qualificationId);
      }

      return { previousQualifications, deletedQualification };
    },
    onError: (error, qualificationId, context) => {
      if (context?.previousQualifications) {
        Object.entries(context.previousQualifications).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      if (
        qualificationId.startsWith("temp-") &&
        context?.deletedQualification
      ) {
        tempToServerIdMap.set(
          qualificationId,
          context.deletedQualification.qualificationId
        );
      }

      const resolvedId = getResolvedTeacherQualificationId(qualificationId);

      if (context?.deletedQualification) {
        queryClient.setQueryData(
          ["teacherQualification", resolvedId],
          context.deletedQualification
        );
      }

      toast.error("教師資格の削除に失敗しました", {
        id: "teacher-qualification-delete-error",
        description: error.message,
      });
    },
    onSuccess: (data, qualificationId) => {
      if (qualificationId.startsWith("temp-")) {
        tempToServerIdMap.delete(qualificationId);
      }

      toast.success("教師資格を削除しました", {
        id: "teacher-qualification-delete-success",
      });
    },
    onSettled: (_, __, qualificationId) => {
      const resolvedId = getResolvedTeacherQualificationId(qualificationId);

      queryClient.invalidateQueries({
        queryKey: ["teacherQualifications"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["teacherQualification", resolvedId],
        refetchType: "none",
      });
    },
  });
}
