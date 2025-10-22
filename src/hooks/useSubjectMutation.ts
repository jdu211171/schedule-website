// src/hooks/useSubjectMutation.ts
import { fetcher, CustomError } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SubjectCreate, SubjectUpdate } from "@/schemas/subject.schema";
import { Subject } from "@/hooks/useSubjectQuery";

// Helper function to extract error message from CustomError or regular Error
const getErrorMessage = (error: Error): string => {
  if (error instanceof CustomError) {
    return (error.info.error as string) || error.message;
  }
  return error.message;
};

type SubjectsResponse = {
  data: Subject[];
  message?: string;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SubjectMutationContext = {
  previousSubjects?: Record<string, SubjectsResponse>;
  previousSubject?: Subject;
  deletedSubject?: Subject;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedSubjectId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useSubjectCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    SubjectsResponse,
    Error,
    SubjectCreate,
    SubjectMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/subjects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newSubject) => {
      await queryClient.cancelQueries({ queryKey: ["subjects"] });
      const queries = queryClient.getQueriesData<SubjectsResponse>({
        queryKey: ["subjects"],
      });
      const previousSubjects: Record<string, SubjectsResponse> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjects[JSON.stringify(queryKey)] = data;
        }
      });
      const tempId = `temp-${Date.now()}`;
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectsResponse>(queryKey);
        if (currentData && Array.isArray(currentData.data)) {
          // Create optimistic subject
          const optimisticSubject: Subject = {
            subjectId: tempId,
            name: newSubject.name,
            notes: newSubject.notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _optimistic: true, // Flag to identify optimistic entries
          } as Subject & { _optimistic?: boolean };

          queryClient.setQueryData<SubjectsResponse>(queryKey, {
            ...currentData,
            data: [optimisticSubject, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          });
        }
      });
      return { previousSubjects, tempId };
    },
    onError: (error, _, context) => {
      if (context?.previousSubjects) {
        Object.entries(context.previousSubjects).forEach(
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

      toast.error("科目の追加に失敗しました", {
        id: "subject-create-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (response, _, context) => {
      if (!context?.tempId) return;

      // Store the mapping between temporary ID and server ID
      const newSubject = response.data[0];
      tempToServerIdMap.set(context.tempId, newSubject.subjectId);

      // Update all subject queries
      const queries = queryClient.getQueriesData<SubjectsResponse>({
        queryKey: ["subjects"],
      });

      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectsResponse>(queryKey);
        if (currentData && Array.isArray(currentData.data)) {
          queryClient.setQueryData<SubjectsResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((subject) =>
              subject.subjectId === context.tempId ? newSubject : subject
            ),
          });
        }
      });

      toast.success("科目を追加しました", {
        id: "subject-create-success",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["subjects"],
        refetchType: "none",
      });
    },
  });
}

export function useSubjectUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    SubjectsResponse,
    Error,
    SubjectUpdate,
    SubjectMutationContext
  >({
    mutationFn: ({ subjectId, ...data }) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedSubjectId(subjectId);

      return fetcher(`/api/subjects/${resolvedId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onMutate: async (updatedSubject) => {
      await queryClient.cancelQueries({ queryKey: ["subjects"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedSubjectId(updatedSubject.subjectId);

      await queryClient.cancelQueries({
        queryKey: ["subject", resolvedId],
      });
      const queries = queryClient.getQueriesData<SubjectsResponse>({
        queryKey: ["subjects"],
      });
      const previousSubjects: Record<string, SubjectsResponse> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjects[JSON.stringify(queryKey)] = data;
        }
      });
      const previousSubject = queryClient.getQueryData<Subject>([
        "subject",
        resolvedId,
      ]);
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectsResponse>(queryKey);
        if (currentData && Array.isArray(currentData.data)) {
          queryClient.setQueryData<SubjectsResponse>(queryKey, {
            ...currentData,
            data: currentData.data.map((subject) =>
              subject.subjectId === updatedSubject.subjectId
                ? {
                    ...subject,
                    ...updatedSubject,
                    name: updatedSubject.name || subject.name,
                    updatedAt: new Date(),
                  }
                : subject
            ),
          });
        }
      });
      if (previousSubject) {
        queryClient.setQueryData<Subject>(["subject", resolvedId], {
          ...previousSubject,
          ...updatedSubject,
          name: updatedSubject.name || previousSubject.name,
          updatedAt: new Date(),
        });
      }
      return { previousSubjects, previousSubject };
    },
    onError: (error, variables, context) => {
      if (context?.previousSubjects) {
        Object.entries(context.previousSubjects).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Resolve the ID for restoring the single subject query
      const resolvedId = getResolvedSubjectId(variables.subjectId);

      if (context?.previousSubject) {
        queryClient.setQueryData(
          ["subject", resolvedId],
          context.previousSubject
        );
      }
      toast.error("科目の更新に失敗しました", {
        id: "subject-update-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: () => {
      toast.success("科目を更新しました", {
        id: "subject-update-success",
      });
    },
    onSettled: (_, __, variables) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedSubjectId(variables.subjectId);

      queryClient.invalidateQueries({
        queryKey: ["subjects"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["subject", resolvedId],
        refetchType: "none",
      });
    },
  });
}

export function useSubjectDelete() {
  const queryClient = useQueryClient();
  return useMutation<SubjectsResponse, Error, string, SubjectMutationContext>({
    mutationFn: (subjectId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedSubjectId(subjectId);

      return fetcher(`/api/subjects/${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (subjectId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["subjects"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedSubjectId(subjectId);

      await queryClient.cancelQueries({ queryKey: ["subject", resolvedId] });

      // Snapshot all subject queries
      const queries = queryClient.getQueriesData<SubjectsResponse>({
        queryKey: ["subjects"],
      });
      const previousSubjects: Record<string, SubjectsResponse> = {};

      // Save all subject queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousSubjects[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the subject being deleted
      let deletedSubject: Subject | undefined;
      for (const [, data] of queries) {
        if (data && data.data) {
          const found = data.data.find(
            (subject) => subject.subjectId === subjectId
          );
          if (found) {
            deletedSubject = found;
            break;
          }
        }
      }

      // Optimistically update all subject queries
      queries.forEach(([queryKey]) => {
        const currentData =
          queryClient.getQueryData<SubjectsResponse>(queryKey);

        if (currentData && Array.isArray(currentData.data)) {
          queryClient.setQueryData<SubjectsResponse>(queryKey, {
            ...currentData,
            data: currentData.data.filter(
              (subject) => subject.subjectId !== subjectId
            ),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // Remove the individual subject query
      queryClient.removeQueries({ queryKey: ["subject", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (subjectId.startsWith("temp-")) {
        tempToServerIdMap.delete(subjectId);
      }

      // Return the snapshots for rollback
      return { previousSubjects, deletedSubject };
    },
    onError: (error, subjectId, context) => {
      // Rollback subject list queries
      if (context?.previousSubjects) {
        Object.entries(context.previousSubjects).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (subjectId.startsWith("temp-") && context?.deletedSubject) {
        tempToServerIdMap.set(subjectId, context.deletedSubject.subjectId);
      }

      // Resolve ID for restoring the single subject query
      const resolvedId = getResolvedSubjectId(subjectId);

      // Restore individual subject query if it existed
      if (context?.deletedSubject) {
        queryClient.setQueryData(
          ["subject", resolvedId],
          context.deletedSubject
        );
      }

      toast.error("科目の削除に失敗しました", {
        id: "subject-delete-error",
        description: getErrorMessage(error),
      });
    },
    onSuccess: (_, subjectId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (subjectId.startsWith("temp-")) {
        tempToServerIdMap.delete(subjectId);
      }

      toast.success("科目を削除しました", {
        id: "subject-delete-success",
      });
    },
    onSettled: (_, __, subjectId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedSubjectId(subjectId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["subjects"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["subject", resolvedId],
        refetchType: "none",
      });
    },
  });
}
