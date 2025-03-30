import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSubjectType } from "@/actions/subjectType/create";
import { updateSubjectType } from "@/actions/subjectType/update";
import { deleteSubjectType } from "@/actions/subjectType/delete";

export function useSubjectTypeCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSubjectType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjectTypes"] });
        },
    });
}

export function useSubjectTypeUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSubjectType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjectTypes"] });
        },
    });
}

export function useSubjectTypeDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteSubjectType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjectTypes"] });
        },
    });
}