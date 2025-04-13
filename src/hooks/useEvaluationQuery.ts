import { useQuery } from "@tanstack/react-query";
import { getEvaluations } from "@/actions/evaluation";
import { getEvaluation } from "@/actions/evaluation/read";
import { getEvaluationsCount } from "@/actions/count";

export function useEvaluationsCount() {
    return useQuery({
        queryKey: ["evaluations", "count"],
        queryFn: () => getEvaluationsCount(),
    });
}

export function useEvaluations(page: number = 1, pageSize: number = 15) {
    return useQuery({
        queryKey: ["evaluations", page, pageSize],
        queryFn: () => getEvaluations({ page, pageSize }),
    });
}

export function useEvaluation(evaluationId: string) {
    return useQuery({
        queryKey: ["evaluations", evaluationId],
        queryFn: () => getEvaluation(evaluationId),
    });
}