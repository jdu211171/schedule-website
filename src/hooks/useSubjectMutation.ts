import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSubject } from "@/actions/subject/create";
import { updateSubject } from "@/actions/subject/update";
import { deleteSubject } from "@/actions/subject/delete";

export function useSubjectCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSubject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
        },
    });
}

export function useSubjectUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateSubject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
        },
    });
}

export function useSubjectDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteSubject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["subjects"] });
        },
    });
}