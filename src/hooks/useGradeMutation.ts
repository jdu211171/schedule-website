import { fetcher } from "@/lib/fetcher";
import { CreateGradeInput, UpdateGradeInput } from "@/schemas/grade.schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Grade, StudentType } from "@prisma/client";
import { toast } from "sonner";

type CreateGradeResponse = {
  message: string;
  data: Grade;
};

type UpdateGradeResponse = {
  message: string;
  data: Grade;
};

type DeleteGradeResponse = {
  message: string;
};

type GradesQueryData = {
  data: Grade[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Define context types for mutations
type GradeMutationContext = {
  previousGrades?: Record<string, GradesQueryData>;
  previousGrade?: Grade;
  deletedGrade?: Grade;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedGradeId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useGradeCreate() {
  const queryClient = useQueryClient();
  return useMutation<
  CreateGradeResponse,
    Error,
    CreateGradeInput & { studentType: StudentType }, // Accept it here for optimistic updates
    GradeMutationContext >
      ({
        mutationFn: (data) => {
          // Create a new object without the studentType property to send to the API
          const { studentType, ...apiData } = data;

          return fetcher("/api/grades", {
            method: "POST",
            body: JSON.stringify(apiData), // Send only the required fields
          });
        },
        onMutate: async (newGrade) => {
          await queryClient.cancelQueries({ queryKey: ["grades"] });
          const queries = queryClient.getQueriesData<GradesQueryData>({
            queryKey: ["grades"],
          });
          const previousGrades: Record<string, GradesQueryData> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousGrades[JSON.stringify(queryKey)] = data;
            }
          });
          const tempId = `temp-${Date.now()}`;
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<GradesQueryData>(queryKey);
            if (currentData) {
              // For optimistic updates, keep the studentType for UI display
              const optimisticGrade = {
                ...newGrade,
                gradeId: tempId,
                _optimistic: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              } as Grade & { _optimistic?: boolean; studentType?: StudentType };

              queryClient.setQueryData<GradesQueryData>(queryKey, {
                ...currentData,
                data: [optimisticGrade, ...currentData.data],
                pagination: {
                  ...currentData.pagination,
                  total: currentData.pagination.total + 1,
                },
              });
            }
          });
          return { previousGrades, tempId };
        },
        onError: (error, _, context) => {
          if (context?.previousGrades) {
            Object.entries(context.previousGrades).forEach(
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

          toast.error("学年の追加に失敗しました", {
            description: error.message,
          });
        },
        onSuccess: (response, _, context) => {
          if (!context?.tempId) return;

          // Store the mapping between temporary ID and server ID
          tempToServerIdMap.set(context.tempId, response.data.gradeId);

          // Update all grade queries
          const queries = queryClient.getQueriesData<GradesQueryData>({
            queryKey: ["grades"],
          });
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<GradesQueryData>(queryKey);
            if (currentData) {
              queryClient.setQueryData<GradesQueryData>(queryKey, {
                ...currentData,
                data: currentData.data.map((grade) =>
                  grade.gradeId === context.tempId ? response.data : grade
                ),
              });
            }
          });
          toast.success("学年を追加しました", {
            description: response.message,
          });
        },
        onSettled: () => {
          queryClient.invalidateQueries({
            queryKey: ["grades"],
            refetchType: "none",
          });
        },
      });
}

export function useGradeUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
  UpdateGradeResponse,
    Error,
    UpdateGradeInput & { studentType: StudentType }, // Accept it here for optimistic updates
    GradeMutationContext >
      ({
        mutationFn: ({ gradeId, studentType, ...data }) => {
          // Resolve the ID before sending to the server
          const resolvedId = getResolvedGradeId(gradeId);

          return fetcher(`/api/grades`, {
            method: "PUT",
            body: JSON.stringify({ gradeId: resolvedId, ...data }), // Don't include studentType
          });
        },
        onMutate: async (updatedGrade) => {
          await queryClient.cancelQueries({ queryKey: ["grades"] });

          // Resolve ID for any potential temporary ID
          const resolvedId = getResolvedGradeId(updatedGrade.gradeId);

          await queryClient.cancelQueries({
            queryKey: ["grade", resolvedId],
          });
          const queries = queryClient.getQueriesData<GradesQueryData>({
            queryKey: ["grades"],
          });
          const previousGrades: Record<string, GradesQueryData> = {};
          queries.forEach(([queryKey, data]) => {
            if (data) {
              previousGrades[JSON.stringify(queryKey)] = data;
            }
          });
          const previousGrade = queryClient.getQueryData<Grade>([
            "grade",
            resolvedId,
          ]);
          queries.forEach(([queryKey]) => {
            const currentData =
              queryClient.getQueryData<GradesQueryData>(queryKey);
            if (currentData) {
              queryClient.setQueryData<GradesQueryData>(queryKey, {
                ...currentData,
                data: currentData.data.map((grade) =>
                  grade.gradeId === updatedGrade.gradeId
                    ? { ...grade, ...updatedGrade, updatedAt: new Date() }
                    : grade
                ),
              });
            }
          });
          if (previousGrade) {
            queryClient.setQueryData<Grade>(["grade", resolvedId], {
              ...previousGrade,
              ...updatedGrade,
              updatedAt: new Date(),
            });
          }
          return { previousGrades, previousGrade };
        },
        onError: (error, variables, context) => {
          if (context?.previousGrades) {
            Object.entries(context.previousGrades).forEach(
              ([queryKeyStr, data]) => {
                const queryKey = JSON.parse(queryKeyStr);
                queryClient.setQueryData(queryKey, data);
              }
            );
          }

          // Resolve the ID for restoring the single grade query
          const resolvedId = getResolvedGradeId(variables.gradeId);

          if (context?.previousGrade) {
            queryClient.setQueryData(
              ["grade", resolvedId],
              context.previousGrade
            );
          }
          toast.error("学年の更新に失敗しました", {
            description: error.message,
          });
        },
        onSuccess: (data) => {
          toast.success("学年を更新しました", {
            description: data.message,
          });
        },
        onSettled: (_, __, variables) => {
          // Resolve ID for proper invalidation
          const resolvedId = getResolvedGradeId(variables.gradeId);

          queryClient.invalidateQueries({
            queryKey: ["grades"],
            refetchType: "none",
          });
          queryClient.invalidateQueries({
            queryKey: ["grade", resolvedId],
            refetchType: "none",
          });
        },
      });
}

// No changes needed to the delete function
export function useGradeDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteGradeResponse, Error, string, GradeMutationContext>({
    // Rest of the code stays the same
    mutationFn: (gradeId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedGradeId(gradeId);

      return fetcher(`/api/grades?gradeId=${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (gradeId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["grades"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedGradeId(gradeId);

      await queryClient.cancelQueries({ queryKey: ["grade", resolvedId] });

      // Snapshot all grade queries
      const queries = queryClient.getQueriesData<GradesQueryData>({
        queryKey: ["grades"],
      });
      const previousGrades: Record<string, GradesQueryData> = {};

      // Save all grade queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousGrades[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the grade being deleted
      let deletedGrade: Grade | undefined;
      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find((grade) => grade.gradeId === gradeId);
          if (found) {
            deletedGrade = found;
            break;
          }
        }
      }

      // Optimistically update all grade queries
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<GradesQueryData>(queryKey);

        if (currentData) {
          queryClient.setQueryData<GradesQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.filter((grade) => grade.gradeId !== gradeId),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // Remove the individual grade query
      queryClient.removeQueries({ queryKey: ["grade", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (gradeId.startsWith("temp-")) {
        tempToServerIdMap.delete(gradeId);
      }

      // Return the snapshots for rollback
      return { previousGrades, deletedGrade };
    },
    onError: (error, gradeId, context) => {
      // Rollback grade list queries
      if (context?.previousGrades) {
        Object.entries(context.previousGrades).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (gradeId.startsWith("temp-") && context?.deletedGrade) {
        tempToServerIdMap.set(gradeId, context.deletedGrade.gradeId);
      }

      // Resolve ID for restoring the single grade query
      const resolvedId = getResolvedGradeId(gradeId);

      // Restore individual grade query if it existed
      if (context?.deletedGrade) {
        queryClient.setQueryData(["grade", resolvedId], context.deletedGrade);
      }

      toast.error("学年の削除に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data, gradeId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (gradeId.startsWith("temp-")) {
        tempToServerIdMap.delete(gradeId);
      }

      toast.success("学年を削除しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, gradeId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedGradeId(gradeId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["grades"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["grade", resolvedId],
        refetchType: "none",
      });
    },
  });
}
