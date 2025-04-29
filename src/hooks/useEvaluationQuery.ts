import { fetcher } from "@/lib/fetcher";
import { useQuery } from "@tanstack/react-query";
import { Evaluation } from "@prisma/client";

type UseEvaluationsParams = {
  page?: number;
  limit?: number;
  name?: string;
  sort?: string;
  order?: "asc" | "desc";
};

type EvaluationsResponse = {
  data: Evaluation[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
};

type SingleEvaluationResponse = {
  data: Evaluation;
};

export function useEvaluations(params: UseEvaluationsParams = {}) {
  const { page = 1, limit = 10, name, sort, order } = params;

  const searchParams = new URLSearchParams(
    Object.entries({ page, limit, name, sort, order }).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = String(value);
      }
      return acc;
    }, {} as Record<string, string>)
  ).toString();

  return useQuery<EvaluationsResponse>({
    queryKey: ["evaluations", page, limit, name, sort, order],
    queryFn: async () => await fetcher<EvaluationsResponse>(`/api/evaluation?${searchParams}`),
  });
}

export function useEvaluation(evaluationId: string) {
  return useQuery<Evaluation>({
    queryKey: ["evaluation", evaluationId],
    queryFn: async () => await fetcher<SingleEvaluationResponse>(`/api/evaluation/${evaluationId}`).then((res) => res.data),
    enabled: !!evaluationId,
  });
}
