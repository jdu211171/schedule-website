import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Evaluation } from "@prisma/client";
import { toast } from "sonner";

type CreateEvaluationInput = {
  name: string;
  score?: number;
  notes?: string;
};

type UpdateEvaluationInput = {
  evaluationId: string;
  name: string;
  score?: number;
  notes?: string;
};

type CreateEvaluationResponse = {
  message: string;
  data: Evaluation;
};

type UpdateEvaluationResponse = {
  message: string;
  data: Evaluation;
};

type DeleteEvaluationResponse = {
  message: string;
};

type EvaluationsQueryData = {
  data: Evaluation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

// Define context types for mutations
type EvaluationMutationContext = {
  previousEvaluations?: Record<string, EvaluationsQueryData>;
  previousEvaluation?: Evaluation;
  deletedEvaluation?: Evaluation;
  tempId?: string;
};

// Maintain a mapping between temporary IDs and server IDs
const tempToServerIdMap = new Map<string, string>();

export function getResolvedEvaluationId(id: string): string {
  return tempToServerIdMap.get(id) || id;
}

export function useEvaluationCreate() {
  const queryClient = useQueryClient();
  return useMutation<
    CreateEvaluationResponse,
    Error,
    CreateEvaluationInput,
    EvaluationMutationContext
  >({
    mutationFn: (data) =>
      fetcher("/api/evaluation", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onMutate: async (newEvaluation) => {
      await queryClient.cancelQueries({ queryKey: ["evaluations"] });
      const queries = queryClient.getQueriesData<EvaluationsQueryData>({
        queryKey: ["evaluations"],
      });
      const previousEvaluations: Record<string, EvaluationsQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousEvaluations[JSON.stringify(queryKey)] = data;
        }
      });
      const tempId = `temp-${Date.now()}`;
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<EvaluationsQueryData>(queryKey);
        if (currentData) {
          const optimisticEvaluation: Evaluation = {
            ...newEvaluation,
            evaluationId: tempId,
            // Add extra metadata for tracking
            _optimistic: true, // Flag to identify optimistic entries
            createdAt: new Date(),
            updatedAt: new Date(),
          } as Evaluation & { _optimistic?: boolean };

          queryClient.setQueryData<EvaluationsQueryData>(queryKey, {
            ...currentData,
            data: [optimisticEvaluation, ...currentData.data],
            pagination: {
              ...currentData.pagination,
              total: currentData.pagination.total + 1,
            },
          });
        }
      });
      return { previousEvaluations, tempId };
    },
    onError: (error, _, context) => {
      if (context?.previousEvaluations) {
        Object.entries(context.previousEvaluations).forEach(
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

      toast.error("評価の追加に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (response, _, context) => {
      if (!context?.tempId) return;

      // Store the mapping between temporary ID and server ID
      tempToServerIdMap.set(context.tempId, response.data.evaluationId);

      // Update all evaluation queries
      const queries = queryClient.getQueriesData<EvaluationsQueryData>({
        queryKey: ["evaluations"],
      });
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<EvaluationsQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<EvaluationsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((evaluation) =>
              evaluation.evaluationId === context.tempId ? response.data : evaluation
            ),
          });
        }
      });
      toast.success("評価を追加しました", {
        description: response.message,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: ["evaluations"],
        refetchType: "none",
      });
    },
  });
}

export function useEvaluationUpdate() {
  const queryClient = useQueryClient();
  return useMutation<
    UpdateEvaluationResponse,
    Error,
    UpdateEvaluationInput,
    EvaluationMutationContext
  >({
    mutationFn: ({ evaluationId, ...data }) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedEvaluationId(evaluationId);

      return fetcher(`/api/evaluation`, {
        method: "PUT",
        body: JSON.stringify({ evaluationId: resolvedId, ...data }),
      });
    },
    onMutate: async (updatedEvaluation) => {
      await queryClient.cancelQueries({ queryKey: ["evaluations"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedEvaluationId(updatedEvaluation.evaluationId);

      await queryClient.cancelQueries({
        queryKey: ["evaluation", resolvedId],
      });
      const queries = queryClient.getQueriesData<EvaluationsQueryData>({
        queryKey: ["evaluations"],
      });
      const previousEvaluations: Record<string, EvaluationsQueryData> = {};
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousEvaluations[JSON.stringify(queryKey)] = data;
        }
      });
      const previousEvaluation = queryClient.getQueryData<Evaluation>([
        "evaluation", resolvedId,
      ]);
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<EvaluationsQueryData>(queryKey);
        if (currentData) {
          queryClient.setQueryData<EvaluationsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.map((evaluation) =>
              evaluation.evaluationId === updatedEvaluation.evaluationId
                ? { ...evaluation, ...updatedEvaluation, updatedAt: new Date() }
                : evaluation
            ),
          });
        }
      });
      if (previousEvaluation) {
        queryClient.setQueryData<Evaluation>(["evaluation", resolvedId], {
          ...previousEvaluation,
          ...updatedEvaluation,
          updatedAt: new Date(),
        });
      }
      return { previousEvaluations, previousEvaluation };
    },
    onError: (error, variables, context) => {
      if (context?.previousEvaluations) {
        Object.entries(context.previousEvaluations).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Resolve the ID for restoring the single evaluation query
      const resolvedId = getResolvedEvaluationId(variables.evaluationId);

      if (context?.previousEvaluation) {
        queryClient.setQueryData(
          ["evaluation", resolvedId],
          context.previousEvaluation
        );
      }
      toast.error("評価の更新に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data) => {
      toast.success("評価を更新しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, variables) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedEvaluationId(variables.evaluationId);

      queryClient.invalidateQueries({
        queryKey: ["evaluations"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["evaluation", resolvedId],
        refetchType: "none",
      });
    },
  });
}

export function useEvaluationDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteEvaluationResponse, Error, string, EvaluationMutationContext>({
    mutationFn: (evaluationId) => {
      // Resolve the ID before sending to the server
      const resolvedId = getResolvedEvaluationId(evaluationId);

      return fetcher(`/api/evaluation?evaluationId=${resolvedId}`, {
        method: "DELETE",
      });
    },
    onMutate: async (evaluationId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["evaluations"] });

      // Resolve ID for any potential temporary ID
      const resolvedId = getResolvedEvaluationId(evaluationId);

      await queryClient.cancelQueries({ queryKey: ["evaluation", resolvedId] });

      // Snapshot all evaluation queries
      const queries = queryClient.getQueriesData<EvaluationsQueryData>({
        queryKey: ["evaluations"],
      });
      const previousEvaluations: Record<string, EvaluationsQueryData> = {};

      // Save all evaluation queries for potential rollback
      queries.forEach(([queryKey, data]) => {
        if (data) {
          previousEvaluations[JSON.stringify(queryKey)] = data;
        }
      });

      // Save the evaluation being deleted
      let deletedEvaluation: Evaluation | undefined;
      for (const [, data] of queries) {
        if (data) {
          const found = data.data.find((evaluation) => evaluation.evaluationId === evaluationId);
          if (found) {
            deletedEvaluation = found;
            break;
          }
        }
      }

      // Optimistically update all evaluation queries
      queries.forEach(([queryKey]) => {
        const currentData = queryClient.getQueryData<EvaluationsQueryData>(queryKey);

        if (currentData) {
          queryClient.setQueryData<EvaluationsQueryData>(queryKey, {
            ...currentData,
            data: currentData.data.filter((evaluation) => evaluation.evaluationId !== evaluationId),
            pagination: {
              ...currentData.pagination,
              total: Math.max(0, currentData.pagination.total - 1),
            },
          });
        }
      });

      // Remove the individual evaluation query
      queryClient.removeQueries({ queryKey: ["evaluation", resolvedId] });

      // If it was a temporary ID, clean up the mapping
      if (evaluationId.startsWith('temp-')) {
        tempToServerIdMap.delete(evaluationId);
      }

      // Return the snapshots for rollback
      return { previousEvaluations, deletedEvaluation };
    },
    onError: (error, evaluationId, context) => {
      // Rollback evaluation list queries
      if (context?.previousEvaluations) {
        Object.entries(context.previousEvaluations).forEach(
          ([queryKeyStr, data]) => {
            const queryKey = JSON.parse(queryKeyStr);
            queryClient.setQueryData(queryKey, data);
          }
        );
      }

      // Restore mapping if it was removed
      if (evaluationId.startsWith('temp-') && context?.deletedEvaluation) {
        tempToServerIdMap.set(evaluationId, context.deletedEvaluation.evaluationId);
      }

      // Resolve ID for restoring the single evaluation query
      const resolvedId = getResolvedEvaluationId(evaluationId);

      // Restore individual evaluation query if it existed
      if (context?.deletedEvaluation) {
        queryClient.setQueryData(["evaluation", resolvedId], context.deletedEvaluation);
      }

      toast.error("評価の削除に失敗しました", {
        description: error.message,
      });
    },
    onSuccess: (data, evaluationId) => {
      // If it was a temporary ID, clean up the mapping on success
      if (evaluationId.startsWith('temp-')) {
        tempToServerIdMap.delete(evaluationId);
      }

      toast.success("評価を削除しました", {
        description: data.message,
      });
    },
    onSettled: (_, __, evaluationId) => {
      // Resolve ID for proper invalidation
      const resolvedId = getResolvedEvaluationId(evaluationId);

      // Invalidate queries in the background to ensure eventual consistency
      queryClient.invalidateQueries({
        queryKey: ["evaluations"],
        refetchType: "none",
      });
      queryClient.invalidateQueries({
        queryKey: ["evaluation", resolvedId],
        refetchType: "none"
      });
    },
  });
}
