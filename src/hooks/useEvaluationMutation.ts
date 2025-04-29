import { fetcher } from "@/lib/fetcher";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Evaluation } from "@prisma/client";

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });
}
