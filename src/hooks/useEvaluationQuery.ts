import { useQuery } from "@tanstack/react-query";
import { getEvaluations } from "@/actions/evaluation";
import { getEvaluation } from "@/actions/evaluation/read";

export function useEvaluations() {
    return useQuery({
        queryKey: ["evaluations"],
        queryFn: getEvaluations,
    });
}

export function useEvaluation(evaluationId: string) {
    return useQuery({
        queryKey: ["evaluations", evaluationId],
        queryFn: () => getEvaluation(evaluationId),
    });
}