import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createStudentType } from "@/actions/studentType/create";
import { updateStudentType } from "@/actions/studentType/update";
import { deleteStudentType } from "@/actions/studentType/delete";

export function useStudentTypeCreate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createStudentType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["studentTypes"] });
        },
    });
}

export function useStudentTypeUpdate() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateStudentType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["studentTypes"] });
        },
    });
}

export function useStudentTypeDelete() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteStudentType,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["studentTypes"] });
        },
    });
}