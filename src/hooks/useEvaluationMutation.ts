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

export function useEvaluationCreate() {
  const queryClient = useQueryClient();
  return useMutation<CreateEvaluationResponse, Error, CreateEvaluationInput>({
    mutationFn: (data) =>
      fetcher("/api/evaluation", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });

      toast.success("評価を追加しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("評価の追加に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useEvaluationUpdate() {
  const queryClient = useQueryClient();
  return useMutation<UpdateEvaluationResponse, Error, UpdateEvaluationInput>({
    mutationFn: ({ evaluationId, ...data }) =>
      fetcher(`/api/evaluation`, {
        method: "PUT",
        body: JSON.stringify({ evaluationId, ...data }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });

      toast.success("評価を更新しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("評価の更新に失敗しました", {
        description: error.message,
      });
    },
  });
}

export function useEvaluationDelete() {
  const queryClient = useQueryClient();
  return useMutation<DeleteEvaluationResponse, Error, string>({
    mutationFn: (evaluationId) =>
      fetcher(`/api/evaluation?evaluationId=${evaluationId}`, {
        method: "DELETE",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });

      toast.success("評価を削除しました", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error("評価の削除に失敗しました", {
        description: error.message,
      });
    },
  });
}
