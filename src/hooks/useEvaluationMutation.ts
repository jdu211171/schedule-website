import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createEvaluation } from "@/actions/evaluation/create";
import { updateEvaluation } from "@/actions/evaluation/update";
import { deleteEvaluation } from "@/actions/evaluation/delete";

export function useEvaluationCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createEvaluation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["evaluations"] });
        },
    });
}

export function useEvaluationUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateEvaluation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["evaluations"] });
        },
    });
}

export function useEvaluationDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteEvaluation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["evaluations"] });
        },
    });
}